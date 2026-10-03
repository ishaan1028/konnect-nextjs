-- =============================================================================
-- Avatars storage bucket.
--
-- Files live at avatars/<user id>/<random uuid>.webp. The bucket is public, so
-- avatars are served straight from the CDN by URL with no auth check (they're
-- shown on public profiles anyway). Writing is locked to the owner's folder.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  -- The app uploads ~50 KB WebP crops; the limit stops anyone abusing the bucket.
  2 * 1024 * 1024,
  array['image/webp', 'image/jpeg', 'image/png']
);

-- Storage permissions are plain RLS policies on storage.objects.
-- (storage.foldername(name))[1] is the first folder in the path: the user id.

create policy "Users can read their own avatar files"
  on storage.objects for select
  to authenticated
  -- Public URLs don't need this; the Storage API does (e.g. to check a file
  -- exists, or to delete it).
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users can upload avatars to their own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users can replace their own avatar files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users can delete their own avatar files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
