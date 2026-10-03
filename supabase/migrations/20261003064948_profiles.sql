-- =============================================================================
-- Profiles: the public face of every Konnect account.
--
-- auth.users (managed by Supabase Auth) holds credentials; public.profiles holds
-- what other people see. A trigger creates the profile at sign-up, so the two can
-- never drift apart, and ON DELETE CASCADE removes it with the account.
-- =============================================================================

-- Internal helpers live in a schema the Data API doesn't expose, so they can't
-- be called over HTTP. Roles get only the minimum access they need.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Username rules, enforced by the database so no client can bypass them.
-- -----------------------------------------------------------------------------
create function private.is_valid_username(username text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    -- 3-20 chars of lowercase letters, digits, "." and "_" ...
    username ~ '^[a-z0-9._]{3,20}$'
    -- ... not starting/ending with a dot, and no ".." (Instagram's rules)
    and username !~ '(^\.|\.$|\.\.)'
    -- Names that would shadow app routes (/explore, /settings ...) or impersonate staff.
    and username <> all (array[
      'about', 'admin', 'api', 'app', 'auth', 'create', 'explore', 'help', 'home',
      'konnect', 'login', 'logout', 'me', 'messages', 'new', 'notifications', 'null',
      'p', 'privacy', 'profile', 'root', 'saved', 'search', 'settings', 'signup',
      'staff', 'static', 'support', 'system', 'terms', 'undefined'
    ]);
$$;

revoke all on function private.is_valid_username(text) from public;
grant execute on function private.is_valid_username(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Table
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Stored lowercase (enforced below), so a plain unique index is case-insensitive.
  username text not null unique,
  full_name text not null,
  bio text not null default '',
  -- Path inside the "avatars" storage bucket (phase 6), not a full URL.
  avatar_path text,
  -- Denormalized counters, maintained by triggers in later phases so feeds
  -- never need COUNT(*). Clients can't write them (see column grants below).
  followers_count integer not null default 0,
  following_count integer not null default 0,
  posts_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_username_valid check (private.is_valid_username(username)),
  constraint profiles_full_name_length check (char_length(btrim(full_name)) between 1 and 50),
  constraint profiles_bio_length check (char_length(bio) <= 150),
  -- Avatars must live in the owner's own folder: avatars/<user id>/...
  constraint profiles_avatar_path_owned check (avatar_path is null or avatar_path like id::text || '/%'),
  constraint profiles_counters_non_negative check (
    followers_count >= 0 and following_count >= 0 and posts_count >= 0
  )
);

comment on table public.profiles is 'Public profile for each auth user. Created by the on_auth_user_created trigger.';

-- -----------------------------------------------------------------------------
-- Keep updated_at honest without trusting the client.
-- -----------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Create the profile when someone signs up.
-- The app sends username + full_name as sign-up metadata. If either is missing
-- or invalid, the insert fails and so does the sign-up: no half-created accounts.
-- SECURITY DEFINER lets it write to public.profiles on behalf of the auth service;
-- the empty search_path stops anyone from hijacking unqualified names.
-- -----------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    lower(btrim(new.raw_user_meta_data ->> 'username')),
    btrim(new.raw_user_meta_data ->> 'full_name')
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- Row Level Security: who may touch which rows.
-- (select auth.uid()) is wrapped in a sub-select so Postgres evaluates it once
-- per query instead of once per row (Supabase performance advisor recommendation).
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "Profiles are visible to everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No insert/delete policies: rows are created by the trigger and removed by the
-- cascade from auth.users, never directly by clients.

-- -----------------------------------------------------------------------------
-- Column privileges: RLS decides *which rows*, grants decide *which columns*.
-- Supabase grants everything to anon/authenticated by default; narrow it down.
-- -----------------------------------------------------------------------------
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;
grant update (username, full_name, bio, avatar_path) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- RPC: live "is this username free?" check for the sign-up and settings forms.
-- -----------------------------------------------------------------------------
create function public.is_username_available(username text)
returns boolean
language sql
stable
set search_path = ''
as $$
  -- The parameter is qualified with the function name: inside the subquery a
  -- bare "username" would resolve to the profiles column instead.
  select
    private.is_valid_username(lower(btrim(is_username_available.username)))
    and not exists (
      select 1
      from public.profiles p
      where p.username = lower(btrim(is_username_available.username))
    );
$$;

comment on function public.is_username_available(text) is
  'True when the username is well-formed, not reserved and not taken.';

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;
