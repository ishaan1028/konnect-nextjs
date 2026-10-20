-- =============================================================================
-- Comments on posts.
--
-- Anyone can read them; you comment as yourself; a comment can be deleted by
-- the person who wrote it or by the owner of the post it's on (Instagram's
-- rule). Comments can't be edited. posts.comments_count is kept by a trigger.
-- =============================================================================

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),

  -- Trimmed by the app; the database also refuses blank or overlong comments.
  constraint comments_body_length check (char_length(btrim(body)) between 1 and 500)
);

comment on table public.comments is 'A comment by author_id on post_id.';

-- A post's thread and its latest comments for feed cards, newest first
-- (keyset on (created_at, id), the index read backwards), and the author key.
create index comments_post_id_created_at_idx on public.comments (post_id, created_at, id);
create index comments_author_id_idx on public.comments (author_id);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.comments enable row level security;

create policy "Comments are visible to everyone"
  on public.comments for select
  to anon, authenticated
  using (true);

create policy "Users can comment as themselves"
  on public.comments for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

create policy "Authors and post owners can delete comments"
  on public.comments for delete
  to authenticated
  using (
    (select auth.uid()) = author_id
    or exists (
      select 1 from public.posts p
      where p.id = comments.post_id and p.author_id = (select auth.uid())
    )
  );

-- Only the content columns can be written, and nothing can be updated.
revoke insert, update, delete, truncate on public.comments from anon, authenticated;
grant insert (post_id, author_id, body) on public.comments to authenticated;
grant delete on public.comments to authenticated;

-- -----------------------------------------------------------------------------
-- Keep posts.comments_count in sync (same pattern as the other counters).
-- -----------------------------------------------------------------------------
create function private.update_comment_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
    return new;
  end if;

  -- DELETE (including cascades when a post or an account is deleted).
  update public.posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

revoke all on function private.update_comment_counts() from public, anon, authenticated;

create trigger comments_update_counts
  after insert or delete on public.comments
  for each row execute function private.update_comment_counts();

-- -----------------------------------------------------------------------------
-- One page of a post's thread, newest first (Instagram's order: a new comment
-- appears at the top, and "View older comments" pages down without the
-- cursor ever skipping), with each author and whether the viewer may delete
-- it (they wrote it, or it's on their post).
-- -----------------------------------------------------------------------------
create function public.get_post_comments(
  post_id uuid,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  max_results integer default 20
)
returns table (
  id uuid,
  body text,
  created_at timestamptz,
  author_id uuid,
  author_username text,
  author_full_name text,
  author_avatar_path text,
  can_delete boolean
)
language sql
stable
set search_path = ''
as $$
  select
    c.id, c.body, c.created_at,
    pr.id, pr.username, pr.full_name, pr.avatar_path,
    (select auth.uid()) in (c.author_id, p.author_id)
  from public.comments c
  join public.profiles pr on pr.id = c.author_id
  join public.posts p on p.id = c.post_id
  where c.post_id = get_post_comments.post_id
    and (c.created_at, c.id) < (
      coalesce(get_post_comments.cursor_created_at, 'infinity'),
      coalesce(get_post_comments.cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')
    )
  order by c.created_at desc, c.id desc
  limit least(greatest(get_post_comments.max_results, 1), 50);
$$;

revoke all on function public.get_post_comments(uuid, timestamptz, uuid, integer) from public;
grant execute on function public.get_post_comments(uuid, timestamptz, uuid, integer) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- The feed now also returns each post's two latest comments (oldest of the
-- two first), so cards can show them without a request per card.
-- A function's return type can't change in place: drop, recreate, re-grant.
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
  latest_comments jsonb
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
