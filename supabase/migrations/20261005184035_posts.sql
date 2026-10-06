-- =============================================================================
-- Posts: one photo with an optional caption, alt text and location.
--
-- The browser crops and compresses the photo, uploads it straight to the
-- "posts" bucket (into the author's own folder), then a Server Action records
-- it here. Counters (likes, comments) are maintained by triggers in later
-- phases; clients can only ever write the columns granted below.
-- =============================================================================

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- Path inside the "posts" storage bucket: <author id>/<random uuid>.webp
  image_path text not null unique,
  -- Stored so every page can reserve the image's exact space before it loads
  -- (no layout shift) and pick the right aspect ratio without probing the file.
  image_width integer not null,
  image_height integer not null,
  -- A ~25-byte blurred preview (base64 ThumbHash), shown while the photo loads.
  thumbhash text,
  alt_text text not null default '',
  caption text not null default '',
  location text not null default '',
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Files must live in the author's own folder (Storage RLS enforces the same).
  constraint posts_image_path_owned check (image_path like author_id::text || '/%'),
  constraint posts_image_size check (
    image_width between 1 and 2160 and image_height between 1 and 2700
  ),
  -- The app crops to 4:5, 1:1 or 1.91:1, so allow that range (plus rounding).
  constraint posts_image_aspect_ratio check (
    image_width * 100 >= image_height * 79 and image_width * 100 <= image_height * 192
  ),
  constraint posts_thumbhash_format check (thumbhash ~ '^[A-Za-z0-9+/]{1,64}={0,2}$'),
  constraint posts_alt_text_length check (char_length(alt_text) <= 250),
  constraint posts_caption_length check (char_length(caption) <= 2200),
  constraint posts_location_length check (char_length(location) <= 100),
  constraint posts_counters_non_negative check (likes_count >= 0 and comments_count >= 0)
);

comment on table public.posts is 'A photo post. Images live in the "posts" storage bucket.';

-- A profile's grid, newest first: keyset pagination walks (created_at, id).
-- (The feed and Explore add their own indexes in phase 9.)
create index posts_author_id_created_at_idx on public.posts (author_id, created_at desc, id desc);

-- -----------------------------------------------------------------------------
-- Row Level Security: anyone can see posts; only the author can change them.
-- -----------------------------------------------------------------------------
alter table public.posts enable row level security;

create policy "Posts are visible to everyone"
  on public.posts for select
  to anon, authenticated
  using (true);

create policy "Users can create posts as themselves"
  on public.posts for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

create policy "Authors can edit their posts"
  on public.posts for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "Authors can delete their posts"
  on public.posts for delete
  to authenticated
  using ((select auth.uid()) = author_id);

-- Column privileges: RLS decides *which rows*, grants decide *which columns*.
-- Counters, ids and timestamps can't be set by clients; once posted, the photo
-- itself can't be swapped, only the text around it can be edited.
revoke insert, update, delete, truncate on public.posts from anon, authenticated;
grant insert (author_id, image_path, image_width, image_height, thumbhash, alt_text, caption, location)
  on public.posts to authenticated;
grant update (alt_text, caption, location) on public.posts to authenticated;
grant delete on public.posts to authenticated;

-- updated_at means "the author edited the text", not "someone liked it".
create trigger posts_set_updated_at
  before update of alt_text, caption, location on public.posts
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Keep profiles.posts_count in sync (same pattern as the follow counters).
-- -----------------------------------------------------------------------------
create function private.update_post_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set posts_count = posts_count + 1 where id = new.author_id;
    return new;
  end if;

  -- DELETE (including cascades when an account is deleted).
  update public.profiles set posts_count = greatest(posts_count - 1, 0) where id = old.author_id;
  return old;
end;
$$;

revoke all on function private.update_post_counts() from public, anon, authenticated;

create trigger posts_update_counts
  after insert or delete on public.posts
  for each row execute function private.update_post_counts();

-- -----------------------------------------------------------------------------
-- One page of a profile's posts, newest first.
-- Keyset pagination: pass the last row's (created_at, id) as the cursor. The
-- first page compares against (infinity, max uuid), so every page is the same
-- row comparison and walks posts_author_id_created_at_idx.
-- -----------------------------------------------------------------------------
create function public.get_profile_posts(
  profile_id uuid,
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
  created_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select p.id, p.image_path, p.image_width, p.image_height, p.thumbhash, p.alt_text, p.created_at
  from public.posts p
  where p.author_id = get_profile_posts.profile_id
    and (p.created_at, p.id) < (
      coalesce(get_profile_posts.cursor_created_at, 'infinity'),
      coalesce(get_profile_posts.cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')
    )
  order by p.created_at desc, p.id desc
  limit least(greatest(get_profile_posts.max_results, 1), 48);
$$;

revoke all on function public.get_profile_posts(uuid, timestamptz, uuid, integer) from public;
grant execute on function public.get_profile_posts(uuid, timestamptz, uuid, integer) to anon, authenticated;

-- =============================================================================
-- Storage: the "posts" bucket. Public read (photos are shown on public pages
-- and served from the CDN by URL); writes only inside your own folder.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'posts',
  'posts',
  true,
  -- The app uploads ~100-300 KB WebP files; the limit stops anyone abusing the bucket.
  5 * 1024 * 1024,
  array['image/webp', 'image/jpeg', 'image/png']
);

create policy "Users can read their own post files"
  on storage.objects for select
  to authenticated
  -- Public URLs don't need this; the Storage API does (to check a file exists
  -- or delete it).
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users can upload post photos to their own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users can delete their own post files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = (select auth.uid()::text));
