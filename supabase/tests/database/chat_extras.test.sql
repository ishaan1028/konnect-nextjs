-- pgTAP tests for unsending messages and reacting to them.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- A and B chat; C is an outsider.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('a2100000-0000-4000-8000-00000000000a', 'xa@example.com', '{"username":"extra_a","full_name":"A"}', 'authenticated', 'authenticated'),
  ('b2100000-0000-4000-8000-00000000000b', 'xb@example.com', '{"username":"extra_b","full_name":"B"}', 'authenticated', 'authenticated'),
  ('c2100000-0000-4000-8000-00000000000c', 'xc@example.com', '{"username":"extra_c","full_name":"C"}', 'authenticated', 'authenticated');
insert into public.conversations (id, dm_key) values
  ('a2200000-0000-4000-8000-000000000001', 'a2100000-0000-4000-8000-00000000000a:b2100000-0000-4000-8000-00000000000b');
insert into public.conversation_participants (conversation_id, user_id) values
  ('a2200000-0000-4000-8000-000000000001', 'a2100000-0000-4000-8000-00000000000a'),
  ('a2200000-0000-4000-8000-000000000001', 'b2100000-0000-4000-8000-00000000000b');
insert into public.messages (id, conversation_id, sender_id, body, created_at) values
  ('a2300000-0000-4000-8000-000000000001', 'a2200000-0000-4000-8000-000000000001', 'a2100000-0000-4000-8000-00000000000a', 'First', now() - interval '2 minutes'),
  ('a2300000-0000-4000-8000-000000000002', 'a2200000-0000-4000-8000-000000000001', 'b2100000-0000-4000-8000-00000000000b', 'Second', now() - interval '1 minute');

-- Act as B ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"b2100000-0000-4000-8000-00000000000b","role":"authenticated"}';

delete from public.messages where id = 'a2300000-0000-4000-8000-000000000001';
select is(
  (select count(*)::int from public.messages where id = 'a2300000-0000-4000-8000-000000000001'),
  1,
  'you cannot unsend someone else''s message'
);

select lives_ok(
  $$ delete from public.messages where id = 'a2300000-0000-4000-8000-000000000002' $$,
  'you can unsend your own message'
);

select is(
  (select last_message_preview from public.conversations where id = 'a2200000-0000-4000-8000-000000000001'),
  'First',
  'the preview falls back to the newest remaining message'
);

select lives_ok(
  $$ insert into public.message_reactions (message_id, user_id, emoji)
     values ('a2300000-0000-4000-8000-000000000001', 'b2100000-0000-4000-8000-00000000000b', '❤️') $$,
  'you can react to a message in your chat'
);

select lives_ok(
  $$ update public.message_reactions set emoji = '😂'
     where message_id = 'a2300000-0000-4000-8000-000000000001' and user_id = 'b2100000-0000-4000-8000-00000000000b' $$,
  'you can change your reaction'
);

select throws_ok(
  $$ insert into public.message_reactions (message_id, user_id, emoji)
     values ('a2300000-0000-4000-8000-000000000001', 'b2100000-0000-4000-8000-00000000000b', '👍') $$,
  '23505', null, 'one reaction per person per message'
);

select throws_ok(
  $$ insert into public.message_reactions (message_id, user_id, emoji)
     values ('a2300000-0000-4000-8000-000000000001', 'a2100000-0000-4000-8000-00000000000a', '👍') $$,
  '42501', null, 'nobody can react as someone else'
);

-- Act as A: sees B's reaction; can't use an emoji outside the set --------------------
set local request.jwt.claims to '{"sub":"a2100000-0000-4000-8000-00000000000a","role":"authenticated"}';

select is(
  (select emoji from public.message_reactions where message_id = 'a2300000-0000-4000-8000-000000000001'),
  '😂',
  'the other person sees the reaction'
);

select throws_ok(
  $$ insert into public.message_reactions (message_id, user_id, emoji)
     values ('a2300000-0000-4000-8000-000000000001', 'a2100000-0000-4000-8000-00000000000a', '🍕') $$,
  '23514', null, 'only the offered emoji are allowed'
);

-- Act as C: sees and can do nothing ----------------------------------------------------
set local request.jwt.claims to '{"sub":"c2100000-0000-4000-8000-00000000000c","role":"authenticated"}';

select is((select count(*)::int from public.message_reactions), 0, 'outsiders see no reactions');

select throws_ok(
  $$ insert into public.message_reactions (message_id, user_id, emoji)
     values ('a2300000-0000-4000-8000-000000000001', 'c2100000-0000-4000-8000-00000000000c', '❤️') $$,
  '42501', null, 'outsiders cannot react'
);

-- Unsending the last message empties the preview -----------------------------------------
set local request.jwt.claims to '{"sub":"a2100000-0000-4000-8000-00000000000a","role":"authenticated"}';
delete from public.messages where id = 'a2300000-0000-4000-8000-000000000001';
reset role;
select is(
  (select row(last_message_at, last_message_preview, last_message_sender_id)::text
   from public.conversations where id = 'a2200000-0000-4000-8000-000000000001'),
  '(,,)',
  'unsending the only message leaves an empty chat (and its reactions go too)'
);

select * from finish();
rollback;
