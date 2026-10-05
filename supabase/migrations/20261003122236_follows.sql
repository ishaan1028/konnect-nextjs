-- =============================================================================
-- Follows: the social graph.
--
-- One row per "A follows B". The composite primary key makes duplicate follows
-- impossible and the CHECK forbids following yourself (the old Mongo version
-- allowed both). Counters on profiles are maintained by a trigger, so they
-- can't drift and clients can never write them.
-- =============================================================================

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

comment on table public.follows is 'follower_id follows following_id.';

-- The primary key already serves "does A follow B?" and A's following list.
-- These serve the newest-first lists (and index the second foreign key).
create index follows_following_id_created_at_idx on public.follows (following_id, created_at desc);
create index follows_follower_id_created_at_idx on public.follows (follower_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.follows enable row level security;

create policy "Follows are visible to everyone"
  on public.follows for select
  to anon, authenticated
  using (true);

create policy "Users can follow others as themselves"
  on public.follows for insert
  to authenticated
  with check ((select auth.uid()) = follower_id);

-- Either side may end the relationship: unfollowing (I'm the follower) or
-- removing a follower (I'm the one being followed).
create policy "Users can unfollow or remove a follower"
  on public.follows for delete
  to authenticated
  using ((select auth.uid()) in (follower_id, following_id));

revoke update, truncate on public.follows from anon, authenticated;
revoke insert, delete on public.follows from anon;

-- -----------------------------------------------------------------------------
-- Keep followers_count / following_count in sync.
-- `count = count + 1` is a single atomic row update, so concurrent follows
-- can't lose increments. SECURITY DEFINER lets it write the counter columns
-- that clients are not granted.
-- -----------------------------------------------------------------------------
create function private.update_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
    return new;
  end if;

  -- DELETE (including cascades when an account is deleted).
  update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
  update public.profiles set followers_count = greatest(followers_count - 1, 0) where id = old.following_id;
  return old;
end;
$$;

revoke all on function private.update_follow_counts() from public, anon, authenticated;

create trigger follows_update_counts
  after insert or delete on public.follows
  for each row execute function private.update_follow_counts();

-- updated_at should mean "the person edited their profile", not "someone
-- followed them": only fire on the user-editable columns.
drop trigger profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update of username, full_name, bio, avatar_path on public.profiles
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RPCs (security invoker: they run with the caller's permissions and RLS)
-- -----------------------------------------------------------------------------

-- Follow state between the viewer and one profile, for the Follow button.
create function public.get_follow_status(target_id uuid)
returns table (is_following boolean, is_followed_by boolean)
language sql
stable
set search_path = ''
as $$
  select
    exists (
      select 1 from public.follows
      where follower_id = (select auth.uid()) and following_id = get_follow_status.target_id
    ),
    exists (
      select 1 from public.follows
      where follower_id = get_follow_status.target_id and following_id = (select auth.uid())
    );
$$;

-- One page of a profile's followers or following, newest first.
-- Keyset pagination: pass the last row's (followed_at, id) as the cursor.
-- Unlike OFFSET, it stays fast on deep pages and never skips or repeats rows
-- when new follows arrive between page loads.
-- Two plain queries (not one with a CASE in the WHERE clause) so each can use
-- its (…_id, created_at desc) index instead of scanning the table.
create function public.get_follow_list(
  profile_id uuid,
  list_kind text,
  cursor_followed_at timestamptz default null,
  cursor_id uuid default null,
  max_results integer default 20
)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_path text,
  followed_at timestamptz,
  viewer_follows boolean
)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  page_size integer := least(greatest(max_results, 1), 50);
  viewer uuid := (select auth.uid());
begin
  if list_kind = 'followers' then
    return query
      select p.id, p.username, p.full_name, p.avatar_path, f.created_at,
        exists (select 1 from public.follows v where v.follower_id = viewer and v.following_id = p.id)
      from public.follows f
      join public.profiles p on p.id = f.follower_id
      where f.following_id = profile_id
        and (cursor_followed_at is null or (f.created_at, p.id) < (cursor_followed_at, cursor_id))
      order by f.created_at desc, p.id desc
      limit page_size;
  elsif list_kind = 'following' then
    return query
      select p.id, p.username, p.full_name, p.avatar_path, f.created_at,
        exists (select 1 from public.follows v where v.follower_id = viewer and v.following_id = p.id)
      from public.follows f
      join public.profiles p on p.id = f.following_id
      where f.follower_id = profile_id
        and (cursor_followed_at is null or (f.created_at, p.id) < (cursor_followed_at, cursor_id))
      order by f.created_at desc, p.id desc
      limit page_size;
  else
    raise exception 'list_kind must be "followers" or "following"' using errcode = '22023';
  end if;
end;
$$;

-- People to follow: not yourself, not already followed. Friends of friends
-- first (followed by people you follow), then the most-followed accounts.
create function public.get_follow_suggestions(max_results integer default 5)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_path text,
  followers_count integer,
  mutual_count integer
)
language sql
stable
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_path,
    p.followers_count,
    (
      select count(*)::integer
      from public.follows mine
      join public.follows theirs on theirs.follower_id = mine.following_id
      where mine.follower_id = (select auth.uid()) and theirs.following_id = p.id
    ) as mutual_count
  from public.profiles p
  where
    p.id <> (select auth.uid())
    and not exists (
      select 1 from public.follows f
      where f.follower_id = (select auth.uid()) and f.following_id = p.id
    )
  order by mutual_count desc, p.followers_count desc, p.created_at desc
  limit least(greatest(get_follow_suggestions.max_results, 1), 20);
$$;

revoke all on function public.get_follow_status(uuid) from public;
revoke all on function public.get_follow_list(uuid, text, timestamptz, uuid, integer) from public;
revoke all on function public.get_follow_suggestions(integer) from public;
grant execute on function public.get_follow_status(uuid) to anon, authenticated;
grant execute on function public.get_follow_list(uuid, text, timestamptz, uuid, integer) to anon, authenticated;
grant execute on function public.get_follow_suggestions(integer) to authenticated;
