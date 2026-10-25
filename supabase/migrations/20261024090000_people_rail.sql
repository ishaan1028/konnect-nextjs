-- =============================================================================
-- The home page's people rail: the people you follow, whoever posted most
-- recently first (with whether that was in the last day, for the ring), then
-- suggestions to fill it up. One round trip.
-- =============================================================================
create function public.get_people_rail(max_results integer default 15)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_path text,
  following boolean,
  posted_recently boolean
)
language sql
stable
set search_path = ''
as $$
  with people as (
    -- shortcut: reads everyone you follow before sorting; cap it (or keep a last_posted_at column) for accounts following thousands.
    select pr.id, pr.username, pr.full_name, pr.avatar_path, pr.followers_count, true as following
    from public.follows f
    join public.profiles pr on pr.id = f.following_id
    where f.follower_id = (select auth.uid())
    union all
    (
      select pr.id, pr.username, pr.full_name, pr.avatar_path, pr.followers_count, false
      from public.profiles pr
      where pr.id <> (select auth.uid())
        and not exists (
          select 1 from public.follows f
          where f.follower_id = (select auth.uid()) and f.following_id = pr.id
        )
      order by pr.followers_count desc, pr.created_at desc
      limit least(greatest(get_people_rail.max_results, 1), 30)
    )
  )
  select
    people.id, people.username, people.full_name, people.avatar_path, people.following,
    coalesce(latest.created_at > now() - interval '1 day', false)
  from people
  left join lateral (
    select p.created_at from public.posts p
    where p.author_id = people.id
    order by p.created_at desc
    limit 1
  ) latest on true
  order by people.following desc, latest.created_at desc nulls last, people.followers_count desc
  limit least(greatest(get_people_rail.max_results, 1), 30);
$$;

revoke all on function public.get_people_rail(integer) from public, anon;
grant execute on function public.get_people_rail(integer) to authenticated;
