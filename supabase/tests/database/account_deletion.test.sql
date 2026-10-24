-- pgTAP tests for deleting an account: everything they made goes (with the
-- counters it touched), nothing holds their id any more, and chats stay for
-- the other person with the messages shown from a "Deleted user".
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- D will be deleted. B and C are other people.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('d8000000-0000-4000-8000-00000000000d', 'del@example.com', '{"username":"del_d","full_name":"D"}', 'authenticated', 'authenticated'),
  ('b8000000-0000-4000-8000-00000000000b', 'delb@example.com', '{"username":"del_b","full_name":"B"}', 'authenticated', 'authenticated'),
  ('c8000000-0000-4000-8000-00000000000c', 'delc@example.com', '{"username":"del_c","full_name":"C"}', 'authenticated', 'authenticated');

insert into public.follows (follower_id, following_id) values
  ('d8000000-0000-4000-8000-00000000000d', 'b8000000-0000-4000-8000-00000000000b'),
  ('b8000000-0000-4000-8000-00000000000b', 'd8000000-0000-4000-8000-00000000000d'),
  ('d8000000-0000-4000-8000-00000000000d', 'c8000000-0000-4000-8000-00000000000c');

insert into public.posts (id, author_id, image_path, image_width, image_height) values
  ('d9000000-0000-4000-8000-000000000001', 'd8000000-0000-4000-8000-00000000000d', 'd8000000-0000-4000-8000-00000000000d/p.webp', 1080, 1080),
  ('b9000000-0000-4000-8000-000000000001', 'b8000000-0000-4000-8000-00000000000b', 'b8000000-0000-4000-8000-00000000000b/p.webp', 1080, 1080);

insert into public.saved_posts (user_id, post_id) values
  ('d8000000-0000-4000-8000-00000000000d', 'b9000000-0000-4000-8000-000000000001');
insert into public.post_likes (post_id, user_id) values
  ('b9000000-0000-4000-8000-000000000001', 'd8000000-0000-4000-8000-00000000000d'),
  ('d9000000-0000-4000-8000-000000000001', 'b8000000-0000-4000-8000-00000000000b');
insert into public.comments (post_id, author_id, body) values
  ('b9000000-0000-4000-8000-000000000001', 'd8000000-0000-4000-8000-00000000000d', 'Nice!'),
  ('d9000000-0000-4000-8000-000000000001', 'b8000000-0000-4000-8000-00000000000b', 'Thanks');

-- Chats: D ↔ B (both wrote), and D ↔ C, which C has already left (deleted below).
insert into public.conversations (id, dm_key) values
  ('da000000-0000-4000-8000-000000000001', 'b8000000-0000-4000-8000-00000000000b:d8000000-0000-4000-8000-00000000000d'),
  ('da000000-0000-4000-8000-000000000002', 'c8000000-0000-4000-8000-00000000000c:d8000000-0000-4000-8000-00000000000d');
insert into public.conversation_participants (conversation_id, user_id) values
  ('da000000-0000-4000-8000-000000000001', 'd8000000-0000-4000-8000-00000000000d'),
  ('da000000-0000-4000-8000-000000000001', 'b8000000-0000-4000-8000-00000000000b'),
  ('da000000-0000-4000-8000-000000000002', 'd8000000-0000-4000-8000-00000000000d'),
  ('da000000-0000-4000-8000-000000000002', 'c8000000-0000-4000-8000-00000000000c');
insert into public.messages (conversation_id, sender_id, body, created_at) values
  ('da000000-0000-4000-8000-000000000001', 'b8000000-0000-4000-8000-00000000000b', 'Hi D', now() - interval '1 minute'),
  ('da000000-0000-4000-8000-000000000001', 'd8000000-0000-4000-8000-00000000000d', 'Hi B', now()),
  ('da000000-0000-4000-8000-000000000002', 'd8000000-0000-4000-8000-00000000000d', 'Hi C', now());
insert into public.message_reactions (message_id, user_id, emoji)
select id, 'd8000000-0000-4000-8000-00000000000d', '❤️' from public.messages where body = 'Hi D';

-- C deletes their account first: the D ↔ C chat survives for D.
delete from auth.users where id = 'c8000000-0000-4000-8000-00000000000c';
select is(
  (select count(*)::int from public.conversation_participants where conversation_id = 'da000000-0000-4000-8000-000000000002'),
  1,
  'a chat survives for the person who is still there'
);

-- Now D deletes theirs (what auth.admin.deleteUser does) ------------------------
delete from auth.users where id = 'd8000000-0000-4000-8000-00000000000d';

select is(
  (select count(*)::int from public.profiles where id = 'd8000000-0000-4000-8000-00000000000d')
    + (select count(*)::int from public.posts where author_id = 'd8000000-0000-4000-8000-00000000000d')
    + (select count(*)::int from public.post_likes where user_id = 'd8000000-0000-4000-8000-00000000000d')
    + (select count(*)::int from public.comments where author_id = 'd8000000-0000-4000-8000-00000000000d')
    + (select count(*)::int from public.follows
       where 'd8000000-0000-4000-8000-00000000000d' in (follower_id, following_id))
    + (select count(*)::int from public.conversation_participants where user_id = 'd8000000-0000-4000-8000-00000000000d')
    + (select count(*)::int from public.messages where sender_id = 'd8000000-0000-4000-8000-00000000000d')
    + (select count(*)::int from public.saved_posts where user_id = 'd8000000-0000-4000-8000-00000000000d')
    + (select count(*)::int from public.notifications
       where 'd8000000-0000-4000-8000-00000000000d' in (recipient_id, actor_id))
    + (select count(*)::int from public.message_reactions where user_id = 'd8000000-0000-4000-8000-00000000000d'),
  0,
  'no profile, post, like, comment, follow, saved post, notification, reaction, chat membership or message holds their id'
);

select is(
  (select count(*)::int from public.conversations
   where dm_key like '%d8000000-0000-4000-8000-00000000000d%'
      or last_message_sender_id = 'd8000000-0000-4000-8000-00000000000d'),
  0,
  'no conversation remembers their id'
);

select is(
  (select count(*)::int from public.comments where post_id = 'd9000000-0000-4000-8000-000000000001'),
  0,
  'comments on their posts go with the posts'
);

select is(
  (select row(followers_count, following_count)::text from public.profiles where id = 'b8000000-0000-4000-8000-00000000000b'),
  '(0,0)',
  'the follow counts of people they followed (and who followed them) go down'
);

select is(
  (select row(likes_count, comments_count)::text from public.posts where id = 'b9000000-0000-4000-8000-000000000001'),
  '(0,0)',
  'their likes and comments no longer count on other people''s posts'
);

-- Chats stay for the other person -------------------------------------------------
select is(
  (select array_agg(body order by created_at)::text from public.messages
   where conversation_id = 'da000000-0000-4000-8000-000000000001'),
  '{"Hi D","Hi B"}',
  'the chat keeps both people''s messages'
);

select is(
  (select sender_id from public.messages where body = 'Hi B'),
  null,
  'their messages are kept without a sender'
);

select is(
  (select count(*)::int from public.conversations where id = 'da000000-0000-4000-8000-000000000002'),
  0,
  'a chat with nobody left in it is removed'
);

select is(
  (select count(*)::int from public.messages where body = 'Hi C'),
  0,
  'and its messages with it'
);

set local role authenticated;
set local request.jwt.claims to '{"sub":"b8000000-0000-4000-8000-00000000000b","role":"authenticated"}';

select is(
  (select row(other_id, other_username, last_message_preview)::text from public.get_inbox()),
  '(,,"Hi B")',
  'the other person''s inbox still has the chat, with nobody on the other side'
);

select is(
  (select count(*)::int from public.messages where conversation_id = 'da000000-0000-4000-8000-000000000001'),
  2,
  'they can still read the history'
);

select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ('da000000-0000-4000-8000-000000000001', null, 'Spoofed') $$,
  '42501', null, 'nobody can send a message without a sender'
);

select is(public.get_unread_count(), 1, 'their last message is still unread for the other person');

select * from finish();
rollback;
