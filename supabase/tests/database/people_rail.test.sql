-- pgTAP tests for the home page's people rail.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

-- V follows F1 (posted an hour ago) and F2 (posted last week); S is a suggestion.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('a3100000-0000-4000-8000-00000000000a', 'rv@example.com', '{"username":"rail_v","full_name":"V"}', 'authenticated', 'authenticated'),
  ('a3100000-0000-4000-8000-0000000000f1', 'rf1@example.com', '{"username":"rail_f1","full_name":"F1"}', 'authenticated', 'authenticated'),
  ('a3100000-0000-4000-8000-0000000000f2', 'rf2@example.com', '{"username":"rail_f2","full_name":"F2"}', 'authenticated', 'authenticated'),
  ('a3100000-0000-4000-8000-0000000000c5', 'rs@example.com', '{"username":"rail_s","full_name":"S"}', 'authenticated', 'authenticated');
insert into public.follows (follower_id, following_id) values
  ('a3100000-0000-4000-8000-00000000000a', 'a3100000-0000-4000-8000-0000000000f1'),
  ('a3100000-0000-4000-8000-00000000000a', 'a3100000-0000-4000-8000-0000000000f2');
insert into public.posts (author_id, image_path, image_width, image_height, created_at) values
  ('a3100000-0000-4000-8000-0000000000f2', 'a3100000-0000-4000-8000-0000000000f2/a.webp', 1080, 1080, now() - interval '7 days'),
  ('a3100000-0000-4000-8000-0000000000f1', 'a3100000-0000-4000-8000-0000000000f1/a.webp', 1080, 1080, now() - interval '1 hour');

set local role authenticated;
set local request.jwt.claims to '{"sub":"a3100000-0000-4000-8000-00000000000a","role":"authenticated"}';

create temp table rail as select row_number() over () as position, * from public.get_people_rail(50);

select is(
  (select array_agg(username order by position)::text from rail where following),
  '{rail_f1,rail_f2}',
  'people you follow come first, most recent poster first'
);

select is(
  (select array_agg(username order by position)::text from rail where username like 'rail\_%' escape '\'),
  '{rail_f1,rail_f2,rail_s}',
  'suggestions fill the rest'
);

select is(
  (select row(posted_recently)::text from rail where username = 'rail_f1')
    || (select row(posted_recently)::text from rail where username = 'rail_f2'),
  '(t)(f)',
  'a post in the last day lights the ring'
);

select is(
  (select count(*)::int from rail where username = 'rail_v'),
  0,
  'you are not in your own rail'
);

reset role;
set local role anon;
select throws_ok(
  $$ select * from public.get_people_rail() $$,
  '42501', null, 'signed-in only'
);

select * from finish();
rollback;
