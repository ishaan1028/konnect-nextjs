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
  '{"provider": "email", "providers": ["email"]}',
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
