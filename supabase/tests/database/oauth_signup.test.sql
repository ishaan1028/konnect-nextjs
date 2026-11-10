-- pgTAP tests for Google/GitHub sign-ups: the trigger derives a username when
-- the provider sends none. Runs as the superuser, like Supabase Auth.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

create function pg_temp.oauth_user(email text, meta jsonb)
returns uuid
language sql
as $$
  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data, aud, role)
  values (gen_random_uuid(), email, meta, '{"provider":"github"}', 'authenticated', 'authenticated')
  returning id;
$$;

create function pg_temp.username_of(user_id uuid)
returns text
language sql
as $$ select username from public.profiles where id = user_id $$;

-- GitHub: the login, with "-" turned into "_", and the display name.
select is(
  pg_temp.username_of(pg_temp.oauth_user('octo@example.com', '{"user_name":"Octo-Cat","name":"Octo Cat"}')),
  'octo_cat',
  'a GitHub login becomes the username'
);
select is(
  (select full_name from public.profiles where username = 'octo_cat'),
  'Octo Cat',
  'the provider name becomes the full name'
);

-- A taken name gets a random suffix instead of failing the sign-up.
select matches(
  pg_temp.username_of(pg_temp.oauth_user('octo2@example.com', '{"user_name":"octo_cat"}')),
  '^octo_cat_[0-9a-f]{4}$',
  'a taken username gets a suffix'
);

-- Google: no login, so the part of the email before "@".
select is(
  pg_temp.username_of(pg_temp.oauth_user('Jane.Doe+news@gmail.com', '{"full_name":"Jane Doe","email":"Jane.Doe+news@gmail.com"}')),
  'jane.doenews',
  'without a login, the email local part becomes the username'
);

-- Reserved and too-short names are made valid with a suffix.
select matches(
  pg_temp.username_of(pg_temp.oauth_user('admin@example.com', '{}')),
  '^admin_[0-9a-f]{4}$',
  'a reserved name gets a suffix'
);
select matches(
  pg_temp.username_of(pg_temp.oauth_user('x@example.com', '{}')),
  '^x_[0-9a-f]{4}$',
  'a too-short name gets a suffix'
);

-- Long logins are cut so the suffix still fits in 20 characters.
select ok(
  private.is_valid_username(pg_temp.username_of(pg_temp.oauth_user('long@example.com', '{"user_name":"a-very-long-github-login-name"}'))),
  'a long login is shortened to a valid username'
);

-- No name from the provider: the username stands in for it.
select pg_temp.oauth_user('noname@example.com', '{"user_name":"noname"}');
select is(
  (select full_name from public.profiles where username = 'noname'),
  'noname',
  'without a name, the username becomes the full name'
);

select * from finish();
rollback;
