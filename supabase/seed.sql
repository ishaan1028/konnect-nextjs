-- Local development seed data. Runs after migrations on `pnpm db:reset`.
-- These credentials are for the local stack only (they're in .env.example);
-- the production demo account is created separately with a secret password.

-- -----------------------------------------------------------------------------
-- Demo account: demo@konnect.dev / konnect-demo-2026  (@alex.demo)
-- Inserted the way Supabase Auth would create a confirmed email user. GoTrue
-- expects empty strings (not NULL) in its token columns, and email sign-in
-- needs a matching row in auth.identities. The on_auth_user_created trigger
-- creates the profile from raw_user_meta_data.
-- -----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token, phone_change, phone_change_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'd3e0a000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'demo@konnect.dev',
  extensions.crypt('konnect-demo-2026', extensions.gen_salt('bf')),
  now(),
  -- app_metadata.demo marks the shared demo account: its profile is read-only
  -- (enforced by RLS, see the lock_demo_account migration).
  '{"provider": "email", "providers": ["email"], "demo": true}',
  '{"username": "alex.demo", "full_name": "Alex Rivera"}',
  now(),
  now(),
  '', '', '', '', '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  'd3e0a000-0000-4000-8000-000000000001',
  'd3e0a000-0000-4000-8000-000000000001',
  'email',
  '{"sub": "d3e0a000-0000-4000-8000-000000000001", "email": "demo@konnect.dev", "email_verified": true}',
  now(),
  now(),
  now()
);

update public.profiles
set bio = 'Just here to show you around Konnect ✨'
where id = 'd3e0a000-0000-4000-8000-000000000001';

-- -----------------------------------------------------------------------------
-- Showcase people, so suggestions, follower lists (and later feeds and chats)
-- have something in them locally. All share the local-only password
-- "konnect-seed-2026", which is handy for testing chat between two browsers.
-- -----------------------------------------------------------------------------
create function pg_temp.seed_person(
  person_id uuid, email text, username text, full_name text, bio text
) returns void
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, reauthentication_token, phone_change, phone_change_token
  ) values (
    '00000000-0000-0000-0000-000000000000', person_id, 'authenticated', 'authenticated', email,
    extensions.crypt('konnect-seed-2026', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('username', username, 'full_name', full_name),
    now(), now(), '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), person_id, person_id, 'email',
    jsonb_build_object('sub', person_id, 'email', email, 'email_verified', true), now(), now(), now());
  update public.profiles set bio = seed_person.bio where id = person_id;
end;
$$;

select pg_temp.seed_person('5eed0000-0000-4000-8000-000000000001', 'maya@konnect.dev', 'maya.k', 'Maya Kapoor', 'Film photography and long walks 📷');
select pg_temp.seed_person('5eed0000-0000-4000-8000-000000000002', 'arjun@konnect.dev', 'arjun.codes', 'Arjun Mehta', 'Shipping side projects on weekends ⚡');
select pg_temp.seed_person('5eed0000-0000-4000-8000-000000000003', 'zoe@konnect.dev', 'zoe.travels', 'Zoe Martin', 'Collecting sunsets in every timezone 🌅');
select pg_temp.seed_person('5eed0000-0000-4000-8000-000000000004', 'leo@konnect.dev', 'leo.bakes', 'Leo Rossi', 'Sourdough evangelist. Ask me about starters 🍞');
select pg_temp.seed_person('5eed0000-0000-4000-8000-000000000005', 'sana@konnect.dev', 'sana.draws', 'Sana Ali', 'Illustrator. Coffee-powered ☕');

-- A small graph: some people follow each other and the demo account, so the
-- demo user sees followers, mutuals and "friends of friends" suggestions.
insert into public.follows (follower_id, following_id) values
  ('5eed0000-0000-4000-8000-000000000001', 'd3e0a000-0000-4000-8000-000000000001'),
  ('5eed0000-0000-4000-8000-000000000002', 'd3e0a000-0000-4000-8000-000000000001'),
  ('5eed0000-0000-4000-8000-000000000003', 'd3e0a000-0000-4000-8000-000000000001'),
  ('d3e0a000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000001'),
  ('5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000004'),
  ('5eed0000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000005'),
  ('5eed0000-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000003'),
  ('5eed0000-0000-4000-8000-000000000004', '5eed0000-0000-4000-8000-000000000005');
