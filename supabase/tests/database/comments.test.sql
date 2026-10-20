-- pgTAP tests for comments: RLS (who can write and delete), constraints, the
-- counter, the thread RPC and the feed's latest comments.
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

-- O owns the post; C comments on it; X is a bystander.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('a5000000-0000-4000-8000-00000000000a', 'co@example.com', '{"username":"cmt_owner","full_name":"Owner"}', 'authenticated', 'authenticated'),
  ('b5000000-0000-4000-8000-00000000000b', 'cc@example.com', '{"username":"cmt_commenter","full_name":"Commenter"}', 'authenticated', 'authenticated'),
  ('c5000000-0000-4000-8000-00000000000c', 'cx@example.com', '{"username":"cmt_bystander","full_name":"Bystander"}', 'authenticated', 'authenticated');

insert into public.posts (id, author_id, image_path, image_width, image_height) values
  ('a6000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-00000000000a/p.webp', 1080, 1080);

-- The commenter follows the owner, so the post is in their feed.
insert into public.follows (follower_id, following_id)
values ('b5000000-0000-4000-8000-00000000000b', 'a5000000-0000-4000-8000-00000000000a');

create function pg_temp.comments_count()
returns integer language sql as $$
  select comments_count from public.posts where id = 'a6000000-0000-4000-8000-000000000001';
$$;

-- Act as the commenter -------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"b5000000-0000-4000-8000-00000000000b","role":"authenticated"}';

select lives_ok(
  $$ insert into public.comments (post_id, author_id, body)
     values ('a6000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-00000000000b', 'First!') $$,
  'a user can comment as themselves'
);

select is(pg_temp.comments_count(), 1, 'commenting increments comments_count');

select throws_ok(
  $$ insert into public.comments (post_id, author_id, body)
     values ('a6000000-0000-4000-8000-000000000001', 'c5000000-0000-4000-8000-00000000000c', 'Not me') $$,
  '42501', null, 'nobody can comment on someone else''s behalf'
);

select throws_ok(
  $$ insert into public.comments (post_id, author_id, body)
     values ('a6000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-00000000000b', '   ') $$,
  '23514', null, 'blank comments are rejected'
);

select throws_ok(
  $$ insert into public.comments (post_id, author_id, body)
     values ('a6000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-00000000000b', repeat('x', 501)) $$,
  '23514', null, 'comments are capped at 500 characters'
);

select throws_ok(
  $$ insert into public.comments (post_id, author_id, body, created_at)
     values ('a6000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-00000000000b', 'backdated', now() - interval '1 year') $$,
  '42501', null, 'clients cannot backdate a comment'
);

select throws_ok(
  $$ update public.comments set body = 'edited' $$,
  '42501', null, 'comments cannot be edited'
);

select lives_ok(
  $$ insert into public.comments (post_id, author_id, body)
     values ('a6000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-00000000000b', 'Second') $$,
  'a second comment'
);
-- Make the order deterministic for the thread and feed checks below.
reset role;
update public.comments set created_at = now() - interval '1 minute' where body = 'First!';
insert into public.comments (post_id, author_id, body, created_at)
values ('a6000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-00000000000a', 'Thanks!', now() + interval '1 minute');
set local role authenticated;

select is(
  (select array_agg(body) from public.get_post_comments('a6000000-0000-4000-8000-000000000001')),
  array['Thanks!', 'Second', 'First!'],
  'the thread is newest first'
);

select is(
  (select array_agg(can_delete order by created_at) from public.get_post_comments('a6000000-0000-4000-8000-000000000001')),
  array[true, true, false],
  'the commenter may delete only their own comments'
);

select is(
  (select jsonb_path_query_array(latest_comments, '$[*].body') from public.get_feed()
   where id = 'a6000000-0000-4000-8000-000000000001'),
  '["Second", "Thanks!"]'::jsonb,
  'feed rows carry the two latest comments, oldest of the two first'
);

-- A bystander can read but not delete ------------------------------------------------
set local request.jwt.claims to '{"sub":"c5000000-0000-4000-8000-00000000000c","role":"authenticated"}';
delete from public.comments where post_id = 'a6000000-0000-4000-8000-000000000001';
reset role;
select is(pg_temp.comments_count(), 3, 'a bystander cannot delete comments');
set local role authenticated;

-- The post owner can delete anyone's comment on their post ----------------------------
set local request.jwt.claims to '{"sub":"a5000000-0000-4000-8000-00000000000a","role":"authenticated"}';
select is(
  (select bool_and(can_delete) from public.get_post_comments('a6000000-0000-4000-8000-000000000001')),
  true,
  'the post owner may delete every comment on their post'
);
delete from public.comments where body = 'First!';
reset role;
select is(pg_temp.comments_count(), 2, 'the post owner deleted someone else''s comment');

-- The commenter deletes their own ---------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"b5000000-0000-4000-8000-00000000000b","role":"authenticated"}';
delete from public.comments where body = 'Second';
reset role;
select is(pg_temp.comments_count(), 1, 'the author deleted their own comment');

-- Anonymous visitors can read the thread but not comment ----------------------------
set local role anon;
select is(
  (select count(*)::int from public.get_post_comments('a6000000-0000-4000-8000-000000000001')),
  1,
  'anonymous visitors can read comments'
);
select throws_ok(
  $$ insert into public.comments (post_id, author_id, body)
     values ('a6000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-00000000000a', 'anon') $$,
  '42501', null, 'anonymous visitors cannot comment'
);

-- Deleting the post removes its comments (and the counter goes with it).
reset role;
delete from public.posts where id = 'a6000000-0000-4000-8000-000000000001';
select is(
  (select count(*)::int from public.comments where post_id = 'a6000000-0000-4000-8000-000000000001'),
  0,
  'deleting a post deletes its comments'
);

select * from finish();
rollback;
