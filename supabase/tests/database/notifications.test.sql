-- pgTAP tests for notifications: written by triggers for likes, comments and
-- follows (never for your own actions), taken back on unlike/unfollow,
-- private to the recipient, and marked read in one go.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- A posts; B interacts with it.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('a1100000-0000-4000-8000-00000000000a', 'na@example.com', '{"username":"notif_a","full_name":"A"}', 'authenticated', 'authenticated'),
  ('b1100000-0000-4000-8000-00000000000b', 'nb@example.com', '{"username":"notif_b","full_name":"B"}', 'authenticated', 'authenticated');
insert into public.posts (id, author_id, image_path, image_width, image_height) values
  ('a1200000-0000-4000-8000-000000000001', 'a1100000-0000-4000-8000-00000000000a', 'a1100000-0000-4000-8000-00000000000a/p.webp', 1080, 1080);

-- Act as B ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"b1100000-0000-4000-8000-00000000000b","role":"authenticated"}';

insert into public.post_likes (post_id, user_id)
values ('a1200000-0000-4000-8000-000000000001', 'b1100000-0000-4000-8000-00000000000b');
delete from public.post_likes where user_id = 'b1100000-0000-4000-8000-00000000000b';
insert into public.post_likes (post_id, user_id)
values ('a1200000-0000-4000-8000-000000000001', 'b1100000-0000-4000-8000-00000000000b');
insert into public.comments (post_id, author_id, body) values
  ('a1200000-0000-4000-8000-000000000001', 'b1100000-0000-4000-8000-00000000000b', 'Love this!');
insert into public.follows (follower_id, following_id)
values ('b1100000-0000-4000-8000-00000000000b', 'a1100000-0000-4000-8000-00000000000a');

select is(
  (select count(*)::int from public.notifications) + (select count(*)::int from public.get_notifications()),
  0,
  'other people''s notifications are private'
);

select throws_ok(
  $$ insert into public.notifications (recipient_id, actor_id, type)
     values ('a1100000-0000-4000-8000-00000000000a', 'b1100000-0000-4000-8000-00000000000b', 'follow') $$,
  '42501', null, 'clients cannot write notifications'
);

-- Act as A: sees the like (once: unlike took the first back), the comment, the follow
set local request.jwt.claims to '{"sub":"a1100000-0000-4000-8000-00000000000a","role":"authenticated"}';

select is(
  (select array_agg(type order by created_at, type)::text from public.get_notifications()),
  '{comment,follow,like}',
  'a like, a comment and a follow each notify the recipient once'
);

select is(
  (select comment_body from public.get_notifications() where type = 'comment'),
  'Love this!',
  'a comment notification shows the comment'
);

select is(
  (select row(actor_username, post_id)::text from public.get_notifications() where type = 'like'),
  '(notif_b,a1200000-0000-4000-8000-000000000001)',
  'a like notification says who and which post'
);

select is(
  (select row(viewer_follows_actor, actor_follows_viewer)::text from public.get_notifications() where type = 'follow'),
  '(f,t)',
  'a follow notification knows you can follow back'
);

insert into public.post_likes (post_id, user_id)
values ('a1200000-0000-4000-8000-000000000001', 'a1100000-0000-4000-8000-00000000000a');
select is(
  (select count(*)::int from public.notifications where type = 'like'),
  1,
  'liking your own post does not notify you'
);

select is(
  (select count(*)::int from public.notifications where read_at is null),
  3,
  'they start unread'
);

-- A follows B back, so B has an unread notification of their own.
insert into public.follows (follower_id, following_id)
values ('a1100000-0000-4000-8000-00000000000a', 'b1100000-0000-4000-8000-00000000000b');

select lives_ok($$ select public.mark_notifications_read() $$, 'you can mark your notifications read');
select is(
  (select count(*)::int from public.notifications where read_at is null),
  0,
  'all of yours are read now'
);

reset role;
select is(
  (select count(*)::int from public.notifications
   where recipient_id = 'b1100000-0000-4000-8000-00000000000b' and read_at is null),
  1,
  'marking yours read leaves other people''s alone'
);

-- Taking things back ----------------------------------------------------------------
delete from public.follows
where follower_id = 'b1100000-0000-4000-8000-00000000000b' and following_id = 'a1100000-0000-4000-8000-00000000000a';
select is(
  (select count(*)::int from public.notifications where type = 'follow' and recipient_id = 'a1100000-0000-4000-8000-00000000000a'),
  0,
  'unfollowing takes the follow notification back'
);

delete from public.comments where body = 'Love this!';
select is(
  (select count(*)::int from public.notifications where type = 'comment' and recipient_id = 'a1100000-0000-4000-8000-00000000000a'),
  0,
  'deleting a comment removes its notification'
);

set local role anon;
select throws_ok(
  $$ select * from public.get_notifications() $$,
  '42501', null, 'anonymous visitors have no notifications'
);

select * from finish();
rollback;
