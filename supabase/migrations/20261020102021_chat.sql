-- =============================================================================
-- Real-time chat: one-to-one conversations.
--
-- Only participants can see a conversation or its messages (RLS through a
-- SECURITY DEFINER helper, which avoids policies recursing into themselves).
-- Messages are inserted straight from the browser (RLS + CHECKs guard it) and
-- a trigger broadcasts each one over Supabase Realtime to private channels,
-- authorized by policies on realtime.messages.
-- =============================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- "<smaller user id>:<larger user id>": one conversation per pair, ever.
  dm_key text not null unique,
  last_message_at timestamptz,
  last_message_preview text,
  -- A denormalized hint for unread badges, never joined: no foreign key needed.
  last_message_sender_id uuid,
  created_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Everything up to here is read (unread badges and "Seen").
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create index conversation_participants_user_id_idx on public.conversation_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),

  constraint messages_body_length check (char_length(btrim(body)) between 1 and 2000)
);

-- A conversation's history, newest first (and the sender foreign key).
create index messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_id_idx on public.messages (sender_id);

-- -----------------------------------------------------------------------------
-- Who's in a conversation. SECURITY DEFINER so policies on the participants
-- table can use it without recursing into themselves.
-- -----------------------------------------------------------------------------
create function private.is_participant(conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_participants p
    where p.conversation_id = is_participant.conversation_id and p.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_participant(uuid) from public, anon;
grant execute on function private.is_participant(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security: participants only.
-- -----------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create policy "Participants can see their conversations"
  on public.conversations for select
  to authenticated
  using (private.is_participant(id));

create policy "Participants can see who is in their conversations"
  on public.conversation_participants for select
  to authenticated
  using (private.is_participant(conversation_id));

create policy "Users can mark their own conversations as read"
  on public.conversation_participants for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Participants can read messages"
  on public.messages for select
  to authenticated
  using (private.is_participant(conversation_id));

create policy "Participants can send messages as themselves"
  on public.messages for insert
  to authenticated
  with check ((select auth.uid()) = sender_id and private.is_participant(conversation_id));

-- Conversations are only created through get_or_create_dm(); messages can't be
-- edited or deleted; only last_read_at can change. The client may choose a
-- message's id, so an optimistic message and its retry are the same row.
revoke all on public.conversations, public.conversation_participants, public.messages from anon;
revoke insert, update, delete, truncate on public.conversations from authenticated;
revoke insert, update, delete, truncate on public.conversation_participants from authenticated;
revoke insert, update, delete, truncate on public.messages from authenticated;
grant update (last_read_at) on public.conversation_participants to authenticated;
grant insert (id, conversation_id, sender_id, body) on public.messages to authenticated;

-- -----------------------------------------------------------------------------
-- Start (or reopen) a one-to-one chat. Starting one needs you to follow the
-- other person; an existing conversation always reopens for its participants.
-- -----------------------------------------------------------------------------
create function public.get_or_create_dm(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  key text;
  conversation uuid;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if other_user_id = me then
    raise exception 'You can''t message yourself' using errcode = '22023';
  end if;

  key := least(me, other_user_id)::text || ':' || greatest(me, other_user_id)::text;
  select c.id into conversation from public.conversations c where c.dm_key = key;
  if conversation is not null then
    return conversation;
  end if;

  if not exists (
    select 1 from public.follows f where f.follower_id = me and f.following_id = other_user_id
  ) then
    raise exception 'You can only message people you follow' using errcode = '42501';
  end if;

  insert into public.conversations (dm_key) values (key)
  on conflict (dm_key) do nothing
  returning id into conversation;
  -- Someone else created it at the same moment.
  if conversation is null then
    select c.id into conversation from public.conversations c where c.dm_key = key;
  end if;

  insert into public.conversation_participants (conversation_id, user_id)
  values (conversation, me), (conversation, other_user_id)
  on conflict do nothing;
  return conversation;
end;
$$;

revoke all on function public.get_or_create_dm(uuid) from public, anon;
grant execute on function public.get_or_create_dm(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- The inbox: my conversations, most recent first, with the other person, the
-- last message, whether it's unread for me and when they last read.
-- -----------------------------------------------------------------------------
create function public.get_inbox()
returns table (
  id uuid,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_sender_id uuid,
  unread boolean,
  other_id uuid,
  other_username text,
  other_full_name text,
  other_avatar_path text,
  other_last_read_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    c.id, c.last_message_at, c.last_message_preview, c.last_message_sender_id,
    c.last_message_sender_id is distinct from me.user_id
      and c.last_message_at > coalesce(me.last_read_at, '-infinity'),
    pr.id, pr.username, pr.full_name, pr.avatar_path,
    them.last_read_at
  from public.conversation_participants me
  join public.conversations c on c.id = me.conversation_id
  join public.conversation_participants them
    on them.conversation_id = c.id and them.user_id <> me.user_id
  join public.profiles pr on pr.id = them.user_id
  where me.user_id = (select auth.uid())
  order by coalesce(c.last_message_at, c.created_at) desc
  -- shortcut: no pagination; the 100 most recent chats is plenty until inboxes get big.
  limit 100;
$$;

-- How many conversations have unread messages (the nav badge).
create function public.get_unread_count()
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.conversation_participants me
  join public.conversations c on c.id = me.conversation_id
  where me.user_id = (select auth.uid())
    and c.last_message_sender_id is distinct from me.user_id
    and c.last_message_at > coalesce(me.last_read_at, '-infinity');
$$;

-- Everything in a conversation is read now (server time, not the browser's).
create function public.mark_conversation_read(conversation_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.conversation_participants p
  set last_read_at = now()
  where p.conversation_id = mark_conversation_read.conversation_id
    and p.user_id = (select auth.uid());
$$;

revoke all on function public.get_inbox() from public, anon;
revoke all on function public.get_unread_count() from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.get_inbox() to authenticated;
grant execute on function public.get_unread_count() to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime. A new message updates the conversation's preview, goes to the
-- conversation's channel (the open thread) and pings each participant's own
-- channel (inbox and unread badge). Reading a conversation tells the other
-- person ("Seen") and your other tabs (badge).
-- -----------------------------------------------------------------------------
create function private.on_message_sent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  participant uuid;
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message_preview = left(new.body, 120),
      last_message_sender_id = new.sender_id
  where id = new.conversation_id;

  perform realtime.send(
    jsonb_build_object(
      'id', new.id, 'conversation_id', new.conversation_id, 'sender_id', new.sender_id,
      'body', new.body, 'created_at', new.created_at
    ),
    'message', 'conversation:' || new.conversation_id, true
  );

  for participant in
    select user_id from public.conversation_participants where conversation_id = new.conversation_id
  loop
    perform realtime.send(
      jsonb_build_object('conversation_id', new.conversation_id), 'inbox', 'user:' || participant, true
    );
  end loop;
  return null;
end;
$$;

create trigger messages_on_sent
  after insert on public.messages
  for each row execute function private.on_message_sent();

create function private.on_conversation_read()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('user_id', new.user_id, 'last_read_at', new.last_read_at),
    'read', 'conversation:' || new.conversation_id, true
  );
  perform realtime.send(
    jsonb_build_object('conversation_id', new.conversation_id), 'inbox', 'user:' || new.user_id, true
  );
  return null;
end;
$$;

create trigger conversation_participants_on_read
  after update of last_read_at on public.conversation_participants
  for each row execute function private.on_conversation_read();

revoke all on function private.on_message_sent() from public, anon, authenticated;
revoke all on function private.on_conversation_read() from public, anon, authenticated;

-- Who may use which Realtime channel:
--   conversation:<id>  participants (receive messages and reads; send "typing")
--   user:<id>          only that user (inbox pings)
--   online             any signed-in user (presence: the online dots)
create function private.can_use_channel(topic text, sending boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if topic ~ '^conversation:[0-9a-f-]{36}$' then
    return private.is_participant(substring(topic from 14)::uuid);
  end if;
  if topic = 'online' then
    return (select auth.uid()) is not null;
  end if;
  -- Only the server sends to a user's own channel.
  return not sending and topic = 'user:' || (select auth.uid())::text;
end;
$$;

revoke all on function private.can_use_channel(text, boolean) from public, anon;
grant execute on function private.can_use_channel(text, boolean) to authenticated;

create policy "Chat channels: receive"
  on realtime.messages for select
  to authenticated
  using (private.can_use_channel((select realtime.topic()), false));

create policy "Chat channels: send typing and presence"
  on realtime.messages for insert
  to authenticated
  with check (private.can_use_channel((select realtime.topic()), true));
