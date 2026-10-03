-- pgTAP tests for public.profiles: sign-up trigger, validation, RLS and grants.
-- Run with `pnpm db:test`. Everything happens in a transaction that is rolled
-- back, so tests never leave data behind.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

-- -----------------------------------------------------------------------------
-- Helpers: create auth users the way Supabase Auth does, and act as them.
-- -----------------------------------------------------------------------------
create function pg_temp.create_user(user_id uuid, username text, full_name text default 'Test User')
returns void
language sql
as $$
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (
    user_id,
    user_id || '@example.com',
    jsonb_build_object('username', username, 'full_name', full_name),
    'authenticated',
    'authenticated'
  );
$$;

-- Switch to the given user's identity, exactly as PostgREST does per request.
create function pg_temp.act_as(user_id uuid)
returns void
language sql
as $$
  -- Back to the superuser first, then become the user for this transaction.
  reset role;
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.act_as_anon()
returns void
language sql
as $$
  reset role;
  select set_config('role', 'anon', true),
         set_config('request.jwt.claims', '{"role":"anon"}', true);
$$;

-- -----------------------------------------------------------------------------
-- Schema
-- -----------------------------------------------------------------------------
select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);

-- -----------------------------------------------------------------------------
-- Sign-up trigger and validation (runs as the superuser, like Supabase Auth)
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select pg_temp.create_user('11111111-1111-1111-1111-111111111111', '  Alice.Doe ', 'Alice Doe') $$,
  'signing up creates a user'
);

select is(
  (select username from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'alice.doe',
  'the trigger creates a profile with a trimmed, lowercase username'
);

select pg_temp.create_user('22222222-2222-2222-2222-222222222222', 'bob', 'Bob');

select throws_ok(
  $$ select pg_temp.create_user(gen_random_uuid(), 'ALICE.DOE') $$,
  '23505',
  null,
  'usernames are unique regardless of case'
);

select throws_ok(
  $$ select pg_temp.create_user(gen_random_uuid(), 'settings') $$,
  '23514',
  null,
  'reserved usernames are rejected'
);

select throws_ok(
  $$ select pg_temp.create_user(gen_random_uuid(), 'bad..name') $$,
  '23514',
  null,
  'usernames with consecutive dots are rejected'
);

select throws_ok(
  $$ select pg_temp.create_user(gen_random_uuid(), 'no spaces allowed') $$,
  '23514',
  null,
  'usernames with invalid characters are rejected'
);

select throws_ok(
  $$ insert into auth.users (id, email, aud, role)
     values (gen_random_uuid(), 'nometa@example.com', 'authenticated', 'authenticated') $$,
  '23502',
  null,
  'sign-up without a username fails instead of creating a half-made account'
);

-- -----------------------------------------------------------------------------
-- Username availability RPC
-- -----------------------------------------------------------------------------
select pg_temp.act_as_anon();

select is(public.is_username_available('new_person'), true, 'a free, valid username is available');
select is(public.is_username_available('Alice.Doe'), false, 'a taken username is unavailable (any case)');
select is(public.is_username_available('explore'), false, 'a reserved username is unavailable');

-- -----------------------------------------------------------------------------
-- RLS: reading
-- -----------------------------------------------------------------------------
select is(
  (select count(*)::int from public.profiles),
  2,
  'anonymous visitors can read public profiles'
);

-- -----------------------------------------------------------------------------
-- RLS + grants: writing (acting as Alice)
-- -----------------------------------------------------------------------------
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

select lives_ok(
  $$ update public.profiles set bio = 'hello' where id = '11111111-1111-1111-1111-111111111111' $$,
  'a user can update their own profile'
);

select is(
  (select bio from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'hello',
  'the update is saved'
);

update public.profiles set bio = 'hacked' where id = '22222222-2222-2222-2222-222222222222';

select is(
  (select bio from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  '',
  'a user cannot update someone else''s profile (RLS filters the row out)'
);

select throws_ok(
  $$ update public.profiles set followers_count = 1000000 where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'users cannot write counter columns, even on their own profile'
);

select throws_ok(
  $$ insert into public.profiles (id, username, full_name)
     values ('33333333-3333-3333-3333-333333333333', 'sneaky', 'Sneaky') $$,
  '42501',
  null,
  'users cannot insert profiles directly'
);

-- -----------------------------------------------------------------------------
-- Account deletion cascades
-- -----------------------------------------------------------------------------
reset role;
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';

select is(
  (select count(*)::int from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  0,
  'deleting the auth user deletes their profile'
);

select * from finish();
rollback;
