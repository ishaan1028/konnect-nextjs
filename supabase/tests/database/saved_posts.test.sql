-- pgTAP tests for saved posts: private to the saver, newest saved first,
-- shown on feed cards, and gone with the post.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- A saves B's posts. C is someone else.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('a9000000-0000-4000-8000-00000000000a', 'sa@example.com', '{"username":"save_a","full_name":"A"}', 'authenticated', 'authenticated'),
  ('b9000000-0000-4000-8000-00000000000b', 'sb@example.com', '{"username":"save_b","full_name":"B"}', 'authenticated', 'authenticated'),
  ('c9000000-0000-4000-8000-00000000000c', 'sc@example.com', '{"username":"save_c","full_name":"C"}', 'authenticated', 'authenticated');
insert into public.follows (follower_id, following_id)
values ('a9000000-0000-4000-8000-00000000000a', 'b9000000-0000-4000-8000-00000000000b');
insert into public.posts (id, author_id, image_path, image_width, image_height, created_at) values
  ('ba000000-0000-4000-8000-000000000001', 'b9000000-0000-4000-8000-00000000000b', 'b9000000-0000-4000-8000-00000000000b/1.webp', 1080, 1080, now() - interval '2 minutes'),
  ('ba000000-0000-4000-8000-000000000002', 'b9000000-0000-4000-8000-00000000000b', 'b9000000-0000-4000-8000-00000000000b/2.webp', 1080, 1080, now() - interval '1 minute');

-- Act as A ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"a9000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$ insert into public.saved_posts (user_id, post_id, created_at) values
       ('a9000000-0000-4000-8000-00000000000a', 'ba000000-0000-4000-8000-000000000002', now() - interval '30 seconds'),
       ('a9000000-0000-4000-8000-00000000000a', 'ba000000-0000-4000-8000-000000000001', now()) $$,
  'you can save posts'
);

select throws_ok(
  $$ insert into public.saved_posts (user_id, post_id)
     values ('a9000000-0000-4000-8000-00000000000a', 'ba000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'saving the same post twice is impossible'
);

select throws_ok(
  $$ insert into public.saved_posts (user_id, post_id)
     values ('c9000000-0000-4000-8000-00000000000c', 'ba000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'nobody can save posts for someone else'
);

select throws_ok(
  $$ update public.saved_posts set created_at = now() $$,
  '42501', null, 'saves cannot be edited'
);

select is(
  (select array_agg(id order by saved_at desc)::text from public.get_saved_posts()),
  '{ba000000-0000-4000-8000-000000000001,ba000000-0000-4000-8000-000000000002}',
  'your saved posts come newest saved first'
);

select is(
  (select array_agg(id)::text from public.get_saved_posts(
     cursor_saved_at => (select saved_at from public.get_saved_posts() order by saved_at desc limit 1),
     cursor_id => 'ba000000-0000-4000-8000-000000000001')),
  '{ba000000-0000-4000-8000-000000000002}',
  'the next page continues after the cursor'
);

select is(
  (select author_username from public.get_saved_posts() limit 1),
  'save_b',
  'saved posts come with their author'
);

select is(
  (select bool_and(saved_by_viewer) from public.get_feed()),
  true,
  'feed cards say you saved them'
);

-- Act as C: sees nothing of A's saves ---------------------------------------------
set local request.jwt.claims to '{"sub":"c9000000-0000-4000-8000-00000000000c","role":"authenticated"}';

select is(
  (select count(*)::int from public.saved_posts) + (select count(*)::int from public.get_saved_posts()),
  0,
  'what you save is private'
);

select lives_ok(
  $$ delete from public.saved_posts where user_id = 'a9000000-0000-4000-8000-00000000000a' $$,
  'trying to unsave for someone else does nothing...'
);

reset role;
select is(
  (select count(*)::int from public.saved_posts where user_id = 'a9000000-0000-4000-8000-00000000000a'),
  2,
  '...their saves are still there'
);

-- Deleting a post removes it from everyone's saved list ----------------------------
delete from public.posts where id = 'ba000000-0000-4000-8000-000000000002';
select is(
  (select count(*)::int from public.saved_posts where post_id = 'ba000000-0000-4000-8000-000000000002'),
  0,
  'a deleted post disappears from saved lists'
);

select * from finish();
rollback;
