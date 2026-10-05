-- pgTAP tests for the read-only demo account and the service-role grants.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'demo-test@example.com',
   '{"provider": "email", "demo": true}', '{"username":"demo_test","full_name":"Demo"}',
   'authenticated', 'authenticated'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'regular@example.com',
   '{"provider": "email"}', '{"username":"regular_test","full_name":"Regular"}',
   'authenticated', 'authenticated');

-- Demo account ---------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';

select is(private.is_demo_user(), true, 'the demo account is recognised');

update public.profiles set full_name = 'Elon Musk' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
reset role;
select is(
  (select full_name from public.profiles where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'Demo',
  'the demo account cannot rename itself'
);

set local role authenticated;
set local request.jwt.claims to '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('avatars', 'dddddddd-dddd-dddd-dddd-dddddddddddd/x.webp', 'dddddddd-dddd-dddd-dddd-dddddddddddd') $$,
  '42501',
  null,
  'the demo account cannot upload a profile photo'
);

-- Regular account ------------------------------------------------------------
set local request.jwt.claims to '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","role":"authenticated"}';
select is(private.is_demo_user(), false, 'a regular account is not a demo account');

update public.profiles set full_name = 'Renamed' where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
reset role;
select is(
  (select full_name from public.profiles where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  'Renamed',
  'regular accounts can still edit their profile'
);

-- Service role (admin client) ---------------------------------------------------
set local role service_role;
select lives_ok(
  $$ update public.profiles set bio = 'set by an admin job'
     where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  'the service role can update profiles (CHECK helper is granted)'
);

select * from finish();
rollback;
