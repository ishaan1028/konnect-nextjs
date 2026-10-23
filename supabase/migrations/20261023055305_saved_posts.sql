-- =============================================================================
-- Saved posts: a private bookmark list. Only you can see what you've saved
-- (unlike likes, nothing about saves is public: no counts, no lists).
-- =============================================================================

create table public.saved_posts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

comment on table public.saved_posts is 'user_id saved post_id. Private to user_id.';

-- Your saved posts, newest saved first (keyset on (created_at, post_id)), and
-- the second foreign key (removed when the post is deleted).
create index saved_posts_user_id_created_at_idx on public.saved_posts (user_id, created_at desc, post_id desc);
create index saved_posts_post_id_idx on public.saved_posts (post_id);

alter table public.saved_posts enable row level security;

create policy "Users can see their own saved posts"
  on public.saved_posts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can save posts for themselves"
  on public.saved_posts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can unsave their own saved posts"
  on public.saved_posts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.saved_posts from anon;
revoke update, truncate on public.saved_posts from authenticated;

-- -----------------------------------------------------------------------------
-- One page of your saved posts, newest saved first, as grid tiles.
-- -----------------------------------------------------------------------------
create function public.get_saved_posts(
  cursor_saved_at timestamptz default null,
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
  created_at timestamptz,
  author_username text,
  saved_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    p.id, p.image_path, p.image_width, p.image_height, p.thumbhash, p.alt_text, p.created_at,
    pr.username, s.created_at
  from public.saved_posts s
  join public.posts p on p.id = s.post_id
  join public.profiles pr on pr.id = p.author_id
  where s.user_id = (select auth.uid())
    and (s.created_at, s.post_id) < (
      coalesce(get_saved_posts.cursor_saved_at, 'infinity'),
      coalesce(get_saved_posts.cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')
    )
  order by s.created_at desc, s.post_id desc
  limit least(greatest(get_saved_posts.max_results, 1), 48);
$$;

revoke all on function public.get_saved_posts(timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_saved_posts(timestamptz, uuid, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- The feed also says whether you saved each post, so a card's bookmark is
-- right without a request per card. (A return type can't change in place.)
-- -----------------------------------------------------------------------------
drop function public.get_feed(timestamptz, uuid, integer);

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
  liked_by_viewer boolean,
  latest_comments jsonb,
  saved_by_viewer boolean
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
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', latest.id,
            'body', latest.body,
            'created_at', latest.created_at,
            'author_username', latest.username
          )
          order by latest.created_at, latest.id
        )
        from (
          select c.id, c.body, c.created_at, cpr.username
          from public.comments c
          join public.profiles cpr on cpr.id = c.author_id
          where c.post_id = p.id
          order by c.created_at desc, c.id desc
          limit 2
        ) latest
      ),
      '[]'::jsonb
    ),
    exists (
      select 1 from public.saved_posts s where s.post_id = p.id and s.user_id = (select auth.uid())
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

revoke all on function public.get_feed(timestamptz, uuid, integer) from public;
-- Supabase grants new functions to anon directly; the feed is signed-in only.
revoke execute on function public.get_feed(timestamptz, uuid, integer) from anon;
grant execute on function public.get_feed(timestamptz, uuid, integer) to authenticated;
