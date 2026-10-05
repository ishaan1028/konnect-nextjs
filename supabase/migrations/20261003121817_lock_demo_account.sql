-- =============================================================================
-- 1. Fix: let the service role run the profile helpers.
--
-- The profiles migration granted private.is_valid_username() (used by a CHECK
-- constraint) only to anon/authenticated, so any update through the admin
-- client (service_role) failed with "permission denied for function". Admin
-- jobs such as account deletion need it.
-- =============================================================================
grant usage on schema private to service_role;
grant execute on function private.is_valid_username(text) to service_role;

-- =============================================================================
-- 2. Lock the shared demo account's identity.
--
-- Every visitor can sign in as the demo account, so anyone could otherwise
-- rename it or change its photo for everyone. Demo accounts are marked with
-- {"demo": true} in raw_app_meta_data, which users can't modify (unlike
-- raw_user_meta_data). The flag is read from auth.users rather than the JWT,
-- so it applies immediately, even to sessions that started before it was set.
-- =============================================================================
create function private.is_demo_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (raw_app_meta_data ->> 'demo')::boolean from auth.users where id = auth.uid()),
    false
  );
$$;

comment on function private.is_demo_user() is
  'True when the current user is a shared demo account (app_metadata.demo).';

revoke all on function private.is_demo_user() from public;
grant execute on function private.is_demo_user() to authenticated;

-- Profiles: the demo account can't edit its own row.
alter policy "Users can update their own profile"
  on public.profiles
  using ((select auth.uid()) = id and not (select private.is_demo_user()))
  with check ((select auth.uid()) = id and not (select private.is_demo_user()));

-- Avatars: the demo account can't upload, replace or delete files.
alter policy "Users can upload avatars to their own folder"
  on storage.objects
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and not (select private.is_demo_user())
  );

alter policy "Users can replace their own avatar files"
  on storage.objects
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and not (select private.is_demo_user())
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and not (select private.is_demo_user())
  );

alter policy "Users can delete their own avatar files"
  on storage.objects
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and not (select private.is_demo_user())
  );
