-- =============================================================================
-- Account deletion. Deleting the auth user cascades to the profile and
-- everything they made (posts, likes, comments, follows). Chats are shared,
-- so they stay for the other person: the deleted person's messages are kept
-- without a sender (shown as "Deleted user") and the conversation forgets
-- their id.
-- =============================================================================

alter table public.messages
  alter column sender_id drop not null,
  drop constraint messages_sender_id_fkey,
  add constraint messages_sender_id_fkey
    foreign key (sender_id) references public.profiles (id) on delete set null;

-- A participant is only ever removed by their account being deleted.
create function private.on_participant_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  participant uuid;
begin
  -- Nobody left who can see it.
  if not exists (
    select 1 from public.conversation_participants p where p.conversation_id = old.conversation_id
  ) then
    delete from public.conversations where id = old.conversation_id;
    return null;
  end if;

  -- The pair key and the last-sender hint held their id.
  update public.conversations
  set dm_key = 'deleted:' || id::text,
      last_message_sender_id = nullif(last_message_sender_id, old.user_id)
  where id = old.conversation_id;

  -- The other person's inbox (and open chat) shows "Deleted user" right away.
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

revoke all on function private.on_participant_removed() from public, anon, authenticated;

create trigger conversation_participants_on_removed
  after delete on public.conversation_participants
  for each row execute function private.on_participant_removed();

-- The inbox keeps chats whose other person deleted their account (other_* is null).
create or replace function public.get_inbox()
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
  left join public.conversation_participants them
    on them.conversation_id = c.id and them.user_id <> me.user_id
  left join public.profiles pr on pr.id = them.user_id
  where me.user_id = (select auth.uid())
  order by coalesce(c.last_message_at, c.created_at) desc
  -- shortcut: no pagination; the 100 most recent chats is plenty until inboxes get big.
  limit 100;
$$;
