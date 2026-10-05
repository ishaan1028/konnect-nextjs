-- Follow lists and suggestions also say whether each person follows the
-- viewer, so their buttons can show "Follow back" from the first paint instead
-- of guessing "Follow" until a per-person status request corrects it.
--
-- A function's return type can't be changed in place, so both are dropped and
-- recreated (same bodies plus one column), then granted again.

drop function public.get_follow_list(uuid, text, timestamptz, uuid, integer);
drop function public.get_follow_suggestions(integer);

-- One page of a profile's followers or following, newest first (keyset
-- pagination on (created_at, id)). viewer_follows: the viewer follows them;
-- follows_viewer: they follow the viewer.
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
  viewer_follows boolean,
  follows_viewer boolean
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
        exists (select 1 from public.follows v where v.follower_id = viewer and v.following_id = p.id),
        exists (select 1 from public.follows v where v.follower_id = p.id and v.following_id = viewer)
      from public.follows f
      join public.profiles p on p.id = f.follower_id
      where f.following_id = profile_id
        and (cursor_followed_at is null or (f.created_at, p.id) < (cursor_followed_at, cursor_id))
      order by f.created_at desc, p.id desc
      limit page_size;
  elsif list_kind = 'following' then
    return query
      select p.id, p.username, p.full_name, p.avatar_path, f.created_at,
        exists (select 1 from public.follows v where v.follower_id = viewer and v.following_id = p.id),
        exists (select 1 from public.follows v where v.follower_id = p.id and v.following_id = viewer)
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
-- follows_viewer: they already follow you (the button says "Follow back").
create function public.get_follow_suggestions(max_results integer default 5)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_path text,
  followers_count integer,
  mutual_count integer,
  follows_viewer boolean
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
    ) as mutual_count,
    exists (
      select 1 from public.follows f
      where f.follower_id = p.id and f.following_id = (select auth.uid())
    ) as follows_viewer
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

revoke all on function public.get_follow_list(uuid, text, timestamptz, uuid, integer) from public;
revoke all on function public.get_follow_suggestions(integer) from public;
grant execute on function public.get_follow_list(uuid, text, timestamptz, uuid, integer) to anon, authenticated;
grant execute on function public.get_follow_suggestions(integer) to authenticated;
