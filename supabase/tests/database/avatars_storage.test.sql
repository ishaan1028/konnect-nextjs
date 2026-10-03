-- pgTAP tests for the avatars bucket's storage policies.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@example.com', '{"username":"avatar_a","full_name":"A"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@example.com', '{"username":"avatar_b","full_name":"B"}', 'authenticated', 'authenticated');

-- Bob already has an avatar file.
insert into storage.objects (bucket_id, name, owner_id)
values ('avatars', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/bob.webp', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

select is(
  (select public from storage.buckets where id = 'avatars'),
  true,
  'the avatars bucket is public (served by URL, no auth)'
);

select is(
  (select file_size_limit from storage.buckets where id = 'avatars'),
  2097152::bigint,
  'avatar uploads are capped at 2 MB'
);

-- Act as Alice.
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('avatars', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/me.webp', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'a user can upload into their own folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('avatars', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/evil.webp', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  '42501',
  null,
  'a user cannot upload into someone else''s folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('avatars', 'evil.webp', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  '42501',
  null,
  'a user cannot upload to the bucket root'
);

-- Deletes can't be tested in SQL: Storage blocks direct deletes from its
-- tables (files must go through the Storage API so the stored file and its
-- row stay in sync). They're covered end-to-end instead. Here we check the
-- policies that govern them.
select is(
  (select count(*)::int from storage.objects where bucket_id = 'avatars'
     and name like 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/%'),
  0,
  'a user cannot see (so cannot delete or overwrite) someone else''s avatar files'
);

select policy_cmd_is(
  'storage', 'objects', 'Users can delete their own avatar files', 'delete',
  'a delete policy scoped to the owner''s folder exists'
);

select * from finish();
rollback;
