-- =============================================================================
-- A conversation's preview is its newest message. Messages sent at almost the
-- same moment can commit out of order, so a later-committing but older message
-- must not overwrite the preview (the inbox would disagree with the thread,
-- which is ordered by created_at).
-- =============================================================================
create or replace function private.on_message_sent()
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
  where id = new.conversation_id
    and (last_message_at is null or last_message_at <= new.created_at);

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
