-- =============================================================================
-- Google and GitHub sign-in: give those accounts a username.
--
-- The sign-up form always sends a username, and that path stays strict: a
-- taken or invalid name still fails the sign-up so the form can say why.
-- OAuth providers send no Konnect username (Google none at all, GitHub its
-- login, which may hold "-" or be taken), so when the metadata has no
-- "username" key we derive one from the GitHub login or the email, and add a
-- short random suffix until it is valid and free. People can rename later.
-- =============================================================================

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base text;
  candidate text;
begin
  if meta ? 'username' then
    candidate := lower(btrim(meta ->> 'username'));
  else
    base := lower(coalesce(
      nullif(meta ->> 'user_name', ''),
      nullif(meta ->> 'preferred_username', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ));
    base := regexp_replace(translate(base, '-', '_'), '[^a-z0-9._]', '', 'g');
    base := regexp_replace(base, '\.{2,}', '.', 'g');
    -- Leave room for "_xxxx" within the 20-character limit.
    base := btrim(left(btrim(base, '.'), 15), '.');
    if base = '' then
      base := 'user';
    end if;

    candidate := base;
    -- shortcut: two sign-ups racing for the same free name can still hit the unique index (one fails, retrying works); fine at this scale.
    while not private.is_valid_username(candidate)
      or exists (select 1 from public.profiles p where p.username = candidate)
    loop
      candidate := base || '_' || substr(md5(random()::text), 1, 4);
    end loop;
  end if;

  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    candidate,
    -- The form sends full_name; Google sends full_name/name, GitHub name (may be empty).
    left(btrim(coalesce(
      nullif(btrim(meta ->> 'full_name'), ''),
      nullif(btrim(meta ->> 'name'), ''),
      case when meta ? 'username' then null else candidate end
    )), 50)
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
