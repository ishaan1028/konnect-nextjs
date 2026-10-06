-- pgTAP tests for follows: RLS, constraints, counters and the RPCs.
begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('a0000000-0000-4000-8000-00000000000a', 'fa@example.com', '{"username":"follow_a","full_name":"A"}', 'authenticated', 'authenticated'),
  ('b0000000-0000-4000-8000-00000000000b', 'fb@example.com', '{"username":"follow_b","full_name":"B"}', 'authenticated', 'authenticated'),
  ('c0000000-0000-4000-8000-00000000000c', 'fc@example.com', '{"username":"follow_c","full_name":"C"}', 'authenticated', 'authenticated');

-- Suggestions are capped and ranked by popularity: make C the most popular so
-- these tests don't depend on whatever else is in the local database.
update public.profiles set followers_count = 1000000 where id = 'c0000000-0000-4000-8000-00000000000c';

create function pg_temp.counts(person uuid)
returns text language sql as $$
  select followers_count || '/' || following_count from public.profiles where id = person;
$$;

-- Act as A ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$ insert into public.follows (follower_id, following_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000b') $$,
  'A can follow B'
);

select is(pg_temp.counts('a0000000-0000-4000-8000-00000000000a'), '0/1', 'A is now following 1');
select is(pg_temp.counts('b0000000-0000-4000-8000-00000000000b'), '1/0', 'B now has 1 follower');

select throws_ok(
  $$ insert into public.follows (follower_id, following_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000b') $$,
  '23505', null, 'following twice is impossible'
);

select throws_ok(
  $$ insert into public.follows (follower_id, following_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'following yourself is impossible'
);

select throws_ok(
  $$ insert into public.follows (follower_id, following_id)
     values ('c0000000-0000-4000-8000-00000000000c', 'b0000000-0000-4000-8000-00000000000b') $$,
  '42501', null, 'A cannot make C follow someone'
);

select throws_ok(
  $$ update public.follows set created_at = now() - interval '1 year' $$,
  '42501', null, 'follows cannot be edited'
);

select is(
  (select is_following from public.get_follow_status('b0000000-0000-4000-8000-00000000000b')),
  true,
  'get_follow_status: A follows B'
);

select is(
  (select array_agg(username order by username) from public.get_follow_suggestions(10)
   where username like 'follow\_%'),
  array['follow_c'],
  'suggestions exclude yourself and people you already follow'
);

-- Act as C (follows A; sees A's following list) ----------------------------------
reset role;
insert into public.follows (follower_id, following_id)
values ('c0000000-0000-4000-8000-00000000000c', 'a0000000-0000-4000-8000-00000000000a');

-- A sees that C follows them back (the button says "Follow back").
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select is(
  (select follows_viewer from public.get_follow_suggestions(10) where username = 'follow_c'),
  true,
  'suggestions say who already follows the viewer'
);

select is(
  (select follows_viewer from public.get_follow_list('a0000000-0000-4000-8000-00000000000a', 'followers')
   where username = 'follow_c'),
  true,
  'follow lists say who follows the viewer'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"c0000000-0000-4000-8000-00000000000c","role":"authenticated"}';

select is(
  (select array_agg(username) from public.get_follow_list('a0000000-0000-4000-8000-00000000000a', 'following')),
  array['follow_b'],
  'get_follow_list returns who A follows'
);

select is(
  (select viewer_follows from public.get_follow_list('a0000000-0000-4000-8000-00000000000a', 'following')),
  false,
  'viewer_follows reflects the viewer (C does not follow B)'
);

select is(
  (select username from public.get_follow_suggestions(10) where username like 'follow\_%' limit 1),
  'follow_b',
  'friends of friends come first (C follows A, A follows B)'
);

select throws_ok(
  $$ select * from public.get_follow_list('a0000000-0000-4000-8000-00000000000a', 'everyone') $$,
  '22023', null, 'unknown list kinds are rejected'
);

-- C cannot delete a follow it's not part of.
delete from public.follows
where follower_id = 'a0000000-0000-4000-8000-00000000000a' and following_id = 'b0000000-0000-4000-8000-00000000000b';
reset role;
select is(
  (select count(*)::int from public.follows
   where follower_id = 'a0000000-0000-4000-8000-00000000000a' and following_id = 'b0000000-0000-4000-8000-00000000000b'),
  1,
  'outsiders cannot delete other people''s follows'
);

-- B removes A as a follower --------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"b0000000-0000-4000-8000-00000000000b","role":"authenticated"}';
delete from public.follows
where follower_id = 'a0000000-0000-4000-8000-00000000000a' and following_id = 'b0000000-0000-4000-8000-00000000000b';
reset role;

select is(pg_temp.counts('b0000000-0000-4000-8000-00000000000b'), '0/0', 'removing a follower updates both counters');

-- Account deletion cascades and keeps counters right -------------------------------
delete from auth.users where id = 'c0000000-0000-4000-8000-00000000000c';
select is(pg_temp.counts('a0000000-0000-4000-8000-00000000000a'), '0/0', 'deleting an account decrements the people it followed');

select is(
  (select count(*)::int from public.follows where follower_id = 'c0000000-0000-4000-8000-00000000000c'),
  0,
  'a deleted account''s follows are gone'
);

select * from finish();
rollback;
