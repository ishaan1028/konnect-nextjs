-- =============================================================================
-- Notifications: someone liked your post, commented on it, or followed you.
-- Written only by triggers (never by clients), private to the recipient, and
-- pushed live to the recipient's own Realtime channel (user:<id>).
-- =============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,

  constraint notifications_type check (type in ('like', 'comment', 'follow')),
  -- Each type points at exactly what it's about.
  constraint notifications_target check (
    (type = 'follow' and post_id is null and comment_id is null)
    or (type = 'like' and post_id is not null and comment_id is null)
    or (type = 'comment' and post_id is not null and comment_id is not null)
  )
);

comment on table public.notifications is 'Activity for recipient_id. Written by triggers only.';

-- Your notifications, newest first (keyset on (created_at, id)), and the other
-- foreign keys (rows go when the actor, post or comment is deleted).
create index notifications_recipient_id_created_at_idx on public.notifications (recipient_id, created_at desc, id desc);
create index notifications_actor_id_idx on public.notifications (actor_id);
create index notifications_post_id_idx on public.notifications (post_id);
create index notifications_comment_id_idx on public.notifications (comment_id);

alter table public.notifications enable row level security;

create policy "Users can see their own notifications"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = recipient_id);

revoke all on public.notifications from anon;
revoke insert, update, delete, truncate on public.notifications from authenticated;

-- -----------------------------------------------------------------------------
-- Writing them. Never for your own actions; every change pings the
-- recipient's channel so the badge and list refresh.
-- -----------------------------------------------------------------------------
create function private.ping_notifications(recipient uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select realtime.send('{}'::jsonb, 'notification', 'user:' || recipient, true);
$$;

create function private.notify(recipient uuid, actor uuid, kind text, post uuid, comment uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if recipient is null or recipient = actor then
    return;
  end if;
  insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
  values (recipient, actor, kind, post, comment);
  perform private.ping_notifications(recipient);
end;
$$;

-- Unlike / unfollow takes the notification back (as if it never happened).
create function private.unnotify(recipient uuid, actor uuid, kind text, post uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications n
  where n.recipient_id = recipient and n.actor_id = actor and n.type = kind
    and n.post_id is not distinct from post;
  if found then
    perform private.ping_notifications(recipient);
  end if;
end;
$$;

create function private.on_like_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(
      (select p.author_id from public.posts p where p.id = new.post_id), new.user_id, 'like', new.post_id, null
    );
  else
    perform private.unnotify(
      (select p.author_id from public.posts p where p.id = old.post_id), old.user_id, 'like', old.post_id
    );
  end if;
  return null;
end;
$$;

create function private.on_comment_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- (A deleted comment takes its notification with it: comment_id cascades.)
  perform private.notify(
    (select p.author_id from public.posts p where p.id = new.post_id), new.author_id, 'comment', new.post_id, new.id
  );
  return null;
end;
$$;

create function private.on_follow_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(new.following_id, new.follower_id, 'follow', null, null);
  else
    perform private.unnotify(old.following_id, old.follower_id, 'follow', null);
  end if;
  return null;
end;
$$;

revoke all on function private.ping_notifications(uuid) from public, anon, authenticated;
revoke all on function private.notify(uuid, uuid, text, uuid, uuid) from public, anon, authenticated;
revoke all on function private.unnotify(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function private.on_like_notify() from public, anon, authenticated;
revoke all on function private.on_comment_notify() from public, anon, authenticated;
revoke all on function private.on_follow_notify() from public, anon, authenticated;

create trigger post_likes_notify
  after insert or delete on public.post_likes
  for each row execute function private.on_like_notify();

create trigger comments_notify
  after insert on public.comments
  for each row execute function private.on_comment_notify();

create trigger follows_notify
  after insert or delete on public.follows
  for each row execute function private.on_follow_notify();

-- -----------------------------------------------------------------------------
-- Reading them: one page, newest first, with who did it, the post's photo,
-- the comment, and the follow state both ways (for "Follow back").
-- -----------------------------------------------------------------------------
create function public.get_notifications(
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  max_results integer default 20
)
returns table (
  id uuid,
  type text,
  created_at timestamptz,
  read boolean,
  actor_id uuid,
  actor_username text,
  actor_full_name text,
  actor_avatar_path text,
  post_id uuid,
  post_image_path text,
  post_thumbhash text,
  comment_body text,
  viewer_follows_actor boolean,
  actor_follows_viewer boolean
)
language sql
stable
set search_path = ''
as $$
  select
    n.id, n.type, n.created_at, n.read_at is not null,
    a.id, a.username, a.full_name, a.avatar_path,
    p.id, p.image_path, p.thumbhash,
    left(c.body, 120),
    exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = a.id),
    exists (select 1 from public.follows f where f.follower_id = a.id and f.following_id = (select auth.uid()))
  from public.notifications n
  join public.profiles a on a.id = n.actor_id
  left join public.posts p on p.id = n.post_id
  left join public.comments c on c.id = n.comment_id
  where n.recipient_id = (select auth.uid())
    and (n.created_at, n.id) < (
      coalesce(get_notifications.cursor_created_at, 'infinity'),
      coalesce(get_notifications.cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')
    )
  order by n.created_at desc, n.id desc
  limit least(greatest(get_notifications.max_results, 1), 50);
$$;

-- Opening the page reads everything (server time); your other tabs' badges follow.
create function public.mark_notifications_read()
returns void
language plpgsql
-- Clients can't write notifications; this only touches the caller's own.
security definer
set search_path = ''
as $$
begin
  update public.notifications
  set read_at = now()
  where recipient_id = (select auth.uid()) and read_at is null;
  if found then
    perform private.ping_notifications((select auth.uid()));
  end if;
end;
$$;

revoke all on function public.get_notifications(timestamptz, uuid, integer) from public, anon;
revoke all on function public.mark_notifications_read() from public, anon;
grant execute on function public.get_notifications(timestamptz, uuid, integer) to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;
