-- =============================================================================
-- Chat extras: unsend your own messages, and react to messages with an emoji.
-- Both go from the browser (RLS checks them) and reach the other person over
-- the conversation's channel, like messages themselves.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Unsend: delete your own message. The conversation's preview falls back to
-- the newest remaining message, and everyone in it hears about it.
-- -----------------------------------------------------------------------------
create policy "Senders can unsend their own messages"
  on public.messages for delete
  to authenticated
  using ((select auth.uid()) = sender_id);

grant delete on public.messages to authenticated;

create function private.on_message_unsent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  participant uuid;
begin
  -- No messages left: every field becomes null ("Say hi").
  update public.conversations c
  set (last_message_at, last_message_preview, last_message_sender_id) = (
    select m.created_at, left(m.body, 120), m.sender_id
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  )
  where c.id = old.conversation_id;

  perform realtime.send(
    jsonb_build_object('id', old.id), 'unsend', 'conversation:' || old.conversation_id, true
  );
  for participant in
    select user_id from public.conversation_participants where conversation_id = old.conversation_id
  loop
    perform realtime.send(
      jsonb_build_object('conversation_id', old.conversation_id), 'inbox', 'user:' || participant, true
    );
  end loop;
  return null;
end;
$$;

revoke all on function private.on_message_unsent() from public, anon, authenticated;

create trigger messages_on_unsent
  after delete on public.messages
  for each row execute function private.on_message_unsent();

-- -----------------------------------------------------------------------------
-- Reactions: one per person per message, from a small fixed set (picking
-- another replaces it; picking the same one again removes it).
-- -----------------------------------------------------------------------------
create table public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id),

  constraint message_reactions_emoji check (emoji in ('❤️', '😂', '😮', '😢', '😡', '👍'))
);

create index message_reactions_user_id_idx on public.message_reactions (user_id);

alter table public.message_reactions enable row level security;

-- The messages policy already limits rows to your conversations, so "the
-- message is visible to you" means "you're in its conversation".
create policy "Participants can see reactions"
  on public.message_reactions for select
  to authenticated
  using (exists (select 1 from public.messages m where m.id = message_id));

create policy "Participants can react as themselves"
  on public.message_reactions for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.messages m where m.id = message_id)
  );

create policy "Users can change their own reactions"
  on public.message_reactions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own reactions"
  on public.message_reactions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.message_reactions from anon;
revoke insert, update, delete, truncate on public.message_reactions from authenticated;
grant insert (message_id, user_id, emoji) on public.message_reactions to authenticated;
grant update (emoji) on public.message_reactions to authenticated;
grant delete on public.message_reactions to authenticated;

create function private.on_reaction_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reaction public.message_reactions := coalesce(new, old);
  conversation uuid;
begin
  -- Gone with its message (unsent or cascaded): the message's own event covers it.
  select m.conversation_id into conversation from public.messages m where m.id = reaction.message_id;
  if conversation is null then
    return null;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'message_id', reaction.message_id,
      'user_id', reaction.user_id,
      'emoji', case when tg_op = 'DELETE' then null else new.emoji end
    ),
    'reaction', 'conversation:' || conversation, true
  );
  return null;
end;
$$;

revoke all on function private.on_reaction_changed() from public, anon, authenticated;

create trigger message_reactions_on_changed
  after insert or update or delete on public.message_reactions
  for each row execute function private.on_reaction_changed();
