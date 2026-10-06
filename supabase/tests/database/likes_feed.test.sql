-- pgTAP tests for likes (RLS, counter, status, likers), the feed, Explore and
-- people search.
begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

-- A follows B; nobody follows C.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('a3000000-0000-4000-8000-00000000000a', 'la@example.com', '{"username":"feed_alice","full_name":"Alice Feed"}', 'authenticated', 'authenticated'),
  ('b3000000-0000-4000-8000-00000000000b', 'lb@example.com', '{"username":"feed_bob","full_name":"Bob Feed"}', 'authenticated', 'authenticated'),
  ('c3000000-0000-4000-8000-00000000000c', 'lc@example.com', '{"username":"feed_carol","full_name":"Carol 100% Feed"}', 'authenticated', 'authenticated');

insert into public.follows (follower_id, following_id)
values ('a3000000-0000-4000-8000-00000000000a', 'b3000000-0000-4000-8000-00000000000b');

insert into public.posts (id, author_id, image_path, image_width, image_height, caption, created_at) values
  ('a4000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-00000000000a/a.webp', 1080, 1080, 'mine', now() - interval '3 minutes'),
  ('b4000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-00000000000b', 'b3000000-0000-4000-8000-00000000000b/b.webp', 1080, 1080, 'followed', now() - interval '2 minutes'),
  ('c4000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-00000000000c', 'c3000000-0000-4000-8000-00000000000c/c.webp', 1080, 1080, 'stranger', now() - interval '1 minute');

create function pg_temp.likes(post uuid)
returns integer language sql as $$ select likes_count from public.posts where id = post; $$;

-- Act as A ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"a3000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$ insert into public.post_likes (post_id, user_id)
     values ('b4000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-00000000000a') $$,
  'A can like B''s post'
);

select is(pg_temp.likes('b4000000-0000-4000-8000-000000000001'), 1, 'liking increments likes_count');

select throws_ok(
  $$ insert into public.post_likes (post_id, user_id)
     values ('b4000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-00000000000a') $$,
  '23505', null, 'liking twice is impossible'
);

select throws_ok(
  $$ insert into public.post_likes (post_id, user_id)
     values ('b4000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-00000000000c') $$,
  '42501', null, 'A cannot like on someone else''s behalf'
);

select is(
  (select row(liked, likes_count)::text from public.get_like_status('b4000000-0000-4000-8000-000000000001')),
  '(t,1)',
  'get_like_status: A liked it, 1 like'
);

select is(
  (select array_agg(caption order by created_at desc) from public.get_feed()),
  array['followed', 'mine'],
  'the feed has my posts and followed people''s posts, newest first, nobody else''s'
);

select is(
  (select liked_by_viewer from public.get_feed() where caption = 'followed'),
  true,
  'feed rows say whether I liked them'
);

select is(
  (select count(*)::int from public.get_feed(
     (select created_at from public.posts where caption = 'followed'),
     'b4000000-0000-4000-8000-000000000001')),
  1,
  'the feed cursor continues after the last row seen'
);

select is(
  (select array_agg(author_username order by created_at desc) from public.get_explore_posts()
   where author_username like 'feed\_%'),
  array['feed_carol', 'feed_bob'],
  'Explore shows everyone else''s posts, not mine'
);

select is(
  (select array_agg(username) from public.get_post_likers('b4000000-0000-4000-8000-000000000001')),
  array['feed_alice'],
  'get_post_likers lists who liked the post'
);

select is(
  (select username from public.search_profiles('feed_bob') limit 1),
  'feed_bob',
  'search finds an exact username first'
);

select is(
  (select array_agg(username order by username) from public.search_profiles('FEED')
   where username like 'feed\_%'),
  array['feed_alice', 'feed_bob', 'feed_carol'],
  'search is case-insensitive and matches substrings'
);

select is(
  (select username from public.search_profiles('100%') limit 1),
  'feed_carol',
  'search matches full names too'
);

select is(
  (select count(*)::int from public.search_profiles('%')
   where username not like '%\%%' and full_name not like '%\%%'),
  0,
  'a % in the query matches a literal %, not everything'
);

select is(
  (select row(viewer_follows, follows_viewer)::text from public.search_profiles('feed_bob') limit 1),
  '(t,f)',
  'search results carry the follow state'
);

-- B cannot remove A's like ------------------------------------------------------
set local request.jwt.claims to '{"sub":"b3000000-0000-4000-8000-00000000000b","role":"authenticated"}';
delete from public.post_likes where user_id = 'a3000000-0000-4000-8000-00000000000a';

reset role;
select is(pg_temp.likes('b4000000-0000-4000-8000-000000000001'), 1, 'B cannot remove A''s like');

-- A unlikes ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"a3000000-0000-4000-8000-00000000000a","role":"authenticated"}';
delete from public.post_likes
where post_id = 'b4000000-0000-4000-8000-000000000001' and user_id = 'a3000000-0000-4000-8000-00000000000a';
reset role;
select is(pg_temp.likes('b4000000-0000-4000-8000-000000000001'), 0, 'unliking decrements likes_count');

-- Anonymous visitors --------------------------------------------------------------
set local role anon;
select throws_ok(
  $$ insert into public.post_likes (post_id, user_id)
     values ('b4000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-00000000000a') $$,
  '42501', null, 'anonymous visitors cannot like'
);
select throws_ok(
  $$ select * from public.get_feed() $$,
  '42501', null, 'anonymous visitors have no feed'
);

select * from finish();
rollback;
