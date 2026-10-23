-- pgTAP tests for chat: starting conversations, privacy (only participants
-- see anything), messages, unread/read, and who may use which Realtime channel.
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

-- A follows B. C is an outsider.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('a7000000-0000-4000-8000-00000000000a', 'ca@example.com', '{"username":"chat_a","full_name":"A"}', 'authenticated', 'authenticated'),
  ('b7000000-0000-4000-8000-00000000000b', 'cb@example.com', '{"username":"chat_b","full_name":"B"}', 'authenticated', 'authenticated'),
  ('c7000000-0000-4000-8000-00000000000c', 'cc2@example.com', '{"username":"chat_c","full_name":"C"}', 'authenticated', 'authenticated');
insert into public.follows (follower_id, following_id)
values ('a7000000-0000-4000-8000-00000000000a', 'b7000000-0000-4000-8000-00000000000b');

create temp table ids (conversation uuid);
grant all on ids to authenticated;

-- Act as A ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"a7000000-0000-4000-8000-00000000000a","role":"authenticated"}';

insert into ids select public.get_or_create_dm('b7000000-0000-4000-8000-00000000000b');
select isnt((select conversation from ids), null, 'A can start a chat with someone they follow');

select is(
  public.get_or_create_dm('b7000000-0000-4000-8000-00000000000b'),
  (select conversation from ids),
  'starting it again reopens the same conversation'
);

select throws_ok(
  $$ select public.get_or_create_dm('a7000000-0000-4000-8000-00000000000a') $$,
  '22023', null, 'you cannot message yourself'
);

select throws_ok(
  $$ select public.get_or_create_dm('c7000000-0000-4000-8000-00000000000c') $$,
  '42501', null, 'you can only start chats with people you follow'
);

select throws_ok(
  $$ insert into public.conversations (dm_key) values ('x:y') $$,
  '42501', null, 'conversations are only created through get_or_create_dm'
);

select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     select conversation, 'a7000000-0000-4000-8000-00000000000a', 'Hey B!' from ids $$,
  'a participant can send a message'
);

select is(
  (select last_message_preview from public.conversations where id = (select conversation from ids)),
  'Hey B!',
  'sending updates the conversation''s preview'
);

-- An older message that commits late (sent at almost the same moment) keeps
-- the newer one as the preview. (created_at is set directly: only the test can.)
reset role;
insert into public.messages (conversation_id, sender_id, body, created_at)
select conversation, 'a7000000-0000-4000-8000-00000000000a', 'Sent first, saved last', now() - interval '1 minute'
from ids;
select is(
  (select last_message_preview from public.conversations where id = (select conversation from ids)),
  'Hey B!',
  'a message that commits late doesn''t replace a newer preview'
);
set local role authenticated;

select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     select conversation, 'b7000000-0000-4000-8000-00000000000b', 'Spoofed' from ids $$,
  '42501', null, 'nobody can send as someone else'
);

select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     select conversation, 'a7000000-0000-4000-8000-00000000000a', '   ' from ids $$,
  '23514', null, 'blank messages are rejected'
);

select throws_ok(
  $$ update public.messages set body = 'edited' $$,
  '42501', null, 'messages cannot be edited'
);

select is(public.get_unread_count(), 0, 'your own message is not unread for you');

-- Act as B: sees the chat, unread until read ---------------------------------------
set local request.jwt.claims to '{"sub":"b7000000-0000-4000-8000-00000000000b","role":"authenticated"}';

select is(
  (select count(*)::int from public.messages where conversation_id = (select conversation from ids)),
  2,
  'the other participant can read the messages'
);

select is(
  (select row(other_username, unread)::text from public.get_inbox()),
  '(chat_a,t)',
  'the inbox shows the other person and the chat as unread'
);

select is(public.get_unread_count(), 1, 'one unread conversation');

select is(
  public.get_or_create_dm('a7000000-0000-4000-8000-00000000000a'),
  (select conversation from ids),
  'B can reopen the chat even without following A'
);

select public.mark_conversation_read((select conversation from ids));
select is(public.get_unread_count(), 0, 'reading the chat clears its unread state');

select ok(
  private.can_use_channel('conversation:' || (select conversation from ids), true),
  'a participant may use the conversation''s channel'
);

-- Act as C: an outsider sees nothing --------------------------------------------
set local request.jwt.claims to '{"sub":"c7000000-0000-4000-8000-00000000000c","role":"authenticated"}';

select is(
  (select count(*)::int from public.messages) + (select count(*)::int from public.conversations),
  0,
  'an outsider sees no conversations or messages'
);

select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     select conversation, 'c7000000-0000-4000-8000-00000000000c', 'Hi' from ids $$,
  '42501', null, 'an outsider cannot post into the conversation'
);

select ok(
  not private.can_use_channel('conversation:' || (select conversation from ids), false),
  'an outsider cannot listen to the conversation''s channel'
);

select ok(
  not private.can_use_channel('user:a7000000-0000-4000-8000-00000000000a', false)
    and private.can_use_channel('user:c7000000-0000-4000-8000-00000000000c', false)
    and not private.can_use_channel('user:c7000000-0000-4000-8000-00000000000c', true),
  'only you can listen to your own channel, and only the server sends to it'
);

-- Anonymous visitors can't chat at all ----------------------------------------------
reset role;
set local role anon;
select throws_ok(
  $$ select public.get_or_create_dm('a7000000-0000-4000-8000-00000000000a') $$,
  '42501', null, 'anonymous visitors cannot start chats'
);

select * from finish();
rollback;
