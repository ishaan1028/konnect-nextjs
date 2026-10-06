-- =============================================================================
-- Likes, the home feed, Explore and people search.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Likes: one row per "A likes post P". The primary key makes double likes
-- impossible; posts.likes_count is maintained by a trigger.
-- -----------------------------------------------------------------------------
create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

comment on table public.post_likes is 'user_id likes post_id.';

-- "Liked by" lists, newest first (keyset on (created_at, user_id)), and the
-- second foreign key (a user's likes, removed when their account is deleted).
create index post_likes_post_id_created_at_idx on public.post_likes (post_id, created_at desc, user_id desc);
create index post_likes_user_id_idx on public.post_likes (user_id);

alter table public.post_likes enable row level security;

-- Who liked a post is public, like the count itself.
create policy "Likes are visible to everyone"
  on public.post_likes for select
  to anon, authenticated
  using (true);

create policy "Users can like posts as themselves"
  on public.post_likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own likes"
  on public.post_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke update, truncate on public.post_likes from anon, authenticated;
revoke insert, delete on public.post_likes from anon;

-- Same pattern as the follow and post counters: one atomic row update each,
-- SECURITY DEFINER because clients can't write counters.
create function private.update_like_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  end if;

  -- DELETE (including cascades when a post or an account is deleted).
  update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

revoke all on function private.update_like_counts() from public, anon, authenticated;

create trigger post_likes_update_counts
  after insert or delete on public.post_likes
  for each row execute function private.update_like_counts();

-- The viewer's like and the current count, for a Like button.
create function public.get_like_status(post_id uuid)
returns table (liked boolean, likes_count integer)
language sql
stable
set search_path = ''
as $$
  select
    exists (
      select 1 from public.post_likes l
      where l.post_id = get_like_status.post_id and l.user_id = (select auth.uid())
    ),
    p.likes_count
  from public.posts p
  where p.id = get_like_status.post_id;
$$;

-- One page of the people who liked a post, newest first, with the follow
-- state in both directions (so their Follow buttons are right immediately).
create function public.get_post_likers(
  post_id uuid,
  cursor_liked_at timestamptz default null,
  cursor_id uuid default null,
  max_results integer default 20
)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_path text,
  liked_at timestamptz,
  viewer_follows boolean,
  follows_viewer boolean
)
language sql
stable
set search_path = ''
as $$
  select
    pr.id, pr.username, pr.full_name, pr.avatar_path, l.created_at,
    exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = pr.id),
    exists (select 1 from public.follows f where f.follower_id = pr.id and f.following_id = (select auth.uid()))
  from public.post_likes l
  join public.profiles pr on pr.id = l.user_id
  where l.post_id = get_post_likers.post_id
    and (l.created_at, l.user_id) < (
      coalesce(get_post_likers.cursor_liked_at, 'infinity'),
      coalesce(get_post_likers.cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')
    )
  order by l.created_at desc, l.user_id desc
  limit least(greatest(get_post_likers.max_results, 1), 50);
$$;

-- -----------------------------------------------------------------------------
-- Home feed: your posts and the posts of people you follow, newest first,
-- with each author and whether you liked it (one round trip per page).
-- -----------------------------------------------------------------------------
create index posts_created_at_idx on public.posts (created_at desc, id desc);

create function public.get_feed(
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  max_results integer default 10
)
returns table (
  id uuid,
  image_path text,
  image_width integer,
  image_height integer,
  thumbhash text,
  alt_text text,
  caption text,
  location text,
  likes_count integer,
  comments_count integer,
  created_at timestamptz,
  author_id uuid,
  author_username text,
  author_full_name text,
  author_avatar_path text,
  liked_by_viewer boolean
)
language sql
stable
set search_path = ''
as $$
  select
    p.id, p.image_path, p.image_width, p.image_height, p.thumbhash, p.alt_text, p.caption,
    p.location, p.likes_count, p.comments_count, p.created_at,
    pr.id, pr.username, pr.full_name, pr.avatar_path,
    exists (
      select 1 from public.post_likes l where l.post_id = p.id and l.user_id = (select auth.uid())
    )
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where (
      p.author_id = (select auth.uid())
      or p.author_id in (
        select f.following_id from public.follows f where f.follower_id = (select auth.uid())
      )
    )
    and (p.created_at, p.id) < (
      coalesce(get_feed.cursor_created_at, 'infinity'),
      coalesce(get_feed.cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')
    )
  order by p.created_at desc, p.id desc
  limit least(greatest(get_feed.max_results, 1), 30);
$$;

-- -----------------------------------------------------------------------------
-- Explore: everyone else's posts, newest first, as grid tiles with counts.
-- -----------------------------------------------------------------------------
create function public.get_explore_posts(
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  max_results integer default 24
)
returns table (
  id uuid,
  image_path text,
  image_width integer,
  image_height integer,
  thumbhash text,
  alt_text text,
  likes_count integer,
  comments_count integer,
  created_at timestamptz,
  author_username text
)
language sql
stable
set search_path = ''
as $$
  select
    p.id, p.image_path, p.image_width, p.image_height, p.thumbhash, p.alt_text,
    p.likes_count, p.comments_count, p.created_at, pr.username
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where p.author_id is distinct from (select auth.uid())
    and (p.created_at, p.id) < (
      coalesce(get_explore_posts.cursor_created_at, 'infinity'),
      coalesce(get_explore_posts.cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')
    )
  order by p.created_at desc, p.id desc
  limit least(greatest(get_explore_posts.max_results, 1), 48);
$$;

-- -----------------------------------------------------------------------------
-- People search: substring match on username and full name, served by
-- trigram indexes (pg_trgm), so "%ali%" doesn't scan every profile.
-- Ranking: exact username, then usernames starting with the query, then the
-- closest match (trigram similarity), then the most followed.
-- -----------------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;

create index profiles_username_trgm_idx on public.profiles using gin (username extensions.gin_trgm_ops);
create index profiles_full_name_trgm_idx on public.profiles using gin (full_name extensions.gin_trgm_ops);

create function public.search_profiles(query text, max_results integer default 20)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_path text,
  followers_count integer,
  viewer_follows boolean,
  follows_viewer boolean
)
language sql
stable
set search_path = ''
as $$
  with q as (
    select
      lower(btrim(search_profiles.query)) as term,
      -- The query is user input: escape LIKE wildcards so "%" and "_" match
      -- themselves instead of everything.
      '%' || replace(replace(replace(lower(btrim(search_profiles.query)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select
    p.id, p.username, p.full_name, p.avatar_path, p.followers_count,
    exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = p.id),
    exists (select 1 from public.follows f where f.follower_id = p.id and f.following_id = (select auth.uid()))
  from public.profiles p, q
  where q.term <> ''
    and (p.username ilike q.pattern or p.full_name ilike q.pattern)
  order by
    p.username = q.term desc,
    left(p.username, length(q.term)) = q.term desc,
    greatest(extensions.similarity(p.username, q.term), extensions.similarity(lower(p.full_name), q.term)) desc,
    p.followers_count desc,
    p.username
  limit least(greatest(search_profiles.max_results, 1), 50);
$$;

-- -----------------------------------------------------------------------------
-- Grants: public reads for anyone; personal lists only when signed in.
-- -----------------------------------------------------------------------------
revoke all on function public.get_like_status(uuid) from public;
revoke all on function public.get_post_likers(uuid, timestamptz, uuid, integer) from public;
revoke all on function public.get_feed(timestamptz, uuid, integer) from public;
revoke all on function public.get_explore_posts(timestamptz, uuid, integer) from public;
revoke all on function public.search_profiles(text, integer) from public;

-- Supabase's default privileges grant every new function to anon directly,
-- so "from public" isn't enough for signed-in-only functions.
revoke execute on function public.get_feed(timestamptz, uuid, integer) from anon;
revoke execute on function public.get_explore_posts(timestamptz, uuid, integer) from anon;
revoke execute on function public.search_profiles(text, integer) from anon;
-- (Same gap in phase 7: suggestions are signed-in only too.)
revoke execute on function public.get_follow_suggestions(integer) from anon;

grant execute on function public.get_like_status(uuid) to anon, authenticated;
grant execute on function public.get_post_likers(uuid, timestamptz, uuid, integer) to anon, authenticated;
grant execute on function public.get_feed(timestamptz, uuid, integer) to authenticated;
grant execute on function public.get_explore_posts(timestamptz, uuid, integer) to authenticated;
grant execute on function public.search_profiles(text, integer) to authenticated;
