-- pgTAP tests for posts: RLS, column grants, constraints, the counter, the RPC
-- and the posts storage bucket.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('a1000000-0000-4000-8000-00000000000a', 'pa@example.com', '{"username":"post_a","full_name":"A"}', 'authenticated', 'authenticated'),
  ('b1000000-0000-4000-8000-00000000000b', 'pb@example.com', '{"username":"post_b","full_name":"B"}', 'authenticated', 'authenticated');

create function pg_temp.posts_count(person uuid)
returns integer language sql as $$
  select posts_count from public.profiles where id = person;
$$;

-- Act as A ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"a1000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$ insert into public.posts (author_id, image_path, image_width, image_height, thumbhash, caption)
     values ('a1000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a/one.webp',
             1080, 1350, 'HBkSHYSIeHiPiHh8eJd4eTN0EEQG', 'Hello') $$,
  'A can post as themselves'
);

select throws_ok(
  $$ insert into public.posts (id, author_id, image_path, image_width, image_height)
     values (gen_random_uuid(), 'a1000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a/id.webp', 1080, 1080) $$,
  '42501', null, 'clients cannot choose a post''s id'
);

select is(pg_temp.posts_count('a1000000-0000-4000-8000-00000000000a'), 1, 'posting increments posts_count');

select throws_ok(
  $$ insert into public.posts (author_id, image_path, image_width, image_height)
     values ('b1000000-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-00000000000b/x.webp', 1080, 1080) $$,
  '42501', null, 'A cannot post as B'
);

select throws_ok(
  $$ insert into public.posts (author_id, image_path, image_width, image_height)
     values ('a1000000-0000-4000-8000-00000000000a', 'b1000000-0000-4000-8000-00000000000b/x.webp', 1080, 1080) $$,
  '23514', null, 'the image must live in the author''s own folder'
);

select throws_ok(
  $$ insert into public.posts (author_id, image_path, image_width, image_height)
     values ('a1000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a/tall.webp', 1080, 2000) $$,
  '23514', null, 'images taller than 4:5 are rejected'
);

select throws_ok(
  $$ insert into public.posts (author_id, image_path, image_width, image_height, caption)
     values ('a1000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a/long.webp', 1080, 1080, repeat('x', 2201)) $$,
  '23514', null, 'captions are capped at 2200 characters'
);

select throws_ok(
  $$ insert into public.posts (author_id, image_path, image_width, image_height, likes_count)
     values ('a1000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a/likes.webp', 1080, 1080, 999) $$,
  '42501', null, 'clients cannot set counters'
);

select lives_ok(
  $$ update public.posts set caption = 'Edited', location = 'Lisbon', alt_text = 'A beach'
     where image_path = 'a1000000-0000-4000-8000-00000000000a/one.webp' $$,
  'the author can edit the caption, location and alt text'
);

select is(
  (select caption || ' / ' || location from public.posts where image_path = 'a1000000-0000-4000-8000-00000000000a/one.webp'),
  'Edited / Lisbon',
  'the edit was saved'
);

select throws_ok(
  $$ update public.posts set image_path = 'a1000000-0000-4000-8000-00000000000a/swap.webp'
     where image_path = 'a1000000-0000-4000-8000-00000000000a/one.webp' $$,
  '42501', null, 'the photo itself cannot be swapped'
);

select throws_ok(
  $$ update public.posts set likes_count = 999 where image_path = 'a1000000-0000-4000-8000-00000000000a/one.webp' $$,
  '42501', null, 'clients cannot change counters'
);

select is(
  (select array_agg(image_path) from public.get_profile_posts('a1000000-0000-4000-8000-00000000000a')),
  array['a1000000-0000-4000-8000-00000000000a/one.webp'],
  'get_profile_posts returns the author''s posts'
);

-- Act as B: someone else's post can be seen but never changed -------------------
set local request.jwt.claims to '{"sub":"b1000000-0000-4000-8000-00000000000b","role":"authenticated"}';

update public.posts set caption = 'Hacked' where image_path = 'a1000000-0000-4000-8000-00000000000a/one.webp';
delete from public.posts where image_path = 'a1000000-0000-4000-8000-00000000000a/one.webp';

reset role;
select is(
  (select caption from public.posts where image_path = 'a1000000-0000-4000-8000-00000000000a/one.webp'),
  'Edited',
  'B cannot edit A''s post'
);
select is(
  (select count(*)::int from public.posts where image_path = 'a1000000-0000-4000-8000-00000000000a/one.webp'),
  1,
  'B cannot delete A''s post'
);

-- Anonymous visitors can read posts ---------------------------------------------
set local role anon;
select is(
  (select count(*)::int from public.posts where image_path = 'a1000000-0000-4000-8000-00000000000a/one.webp'),
  1,
  'posts are public'
);
select throws_ok(
  $$ insert into public.posts (author_id, image_path, image_width, image_height)
     values ('a1000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a/anon.webp', 1080, 1080) $$,
  '42501', null, 'anonymous visitors cannot post'
);

-- A deletes their post ---------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"a1000000-0000-4000-8000-00000000000a","role":"authenticated"}';
delete from public.posts where image_path = 'a1000000-0000-4000-8000-00000000000a/one.webp';
reset role;

select is(pg_temp.posts_count('a1000000-0000-4000-8000-00000000000a'), 0, 'deleting decrements posts_count');

-- Storage --------------------------------------------------------------------
select is(
  (select public::text || ' / ' || file_size_limit::text from storage.buckets where id = 'posts'),
  'true / 5242880',
  'the posts bucket is public with a 5 MB limit'
);

set local role authenticated;
set local request.jwt.claims to '{"sub":"a1000000-0000-4000-8000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('posts', 'a1000000-0000-4000-8000-00000000000a/photo.webp', 'a1000000-0000-4000-8000-00000000000a') $$,
  'a user can upload into their own posts folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('posts', 'b1000000-0000-4000-8000-00000000000b/evil.webp', 'a1000000-0000-4000-8000-00000000000a') $$,
  '42501', null, 'a user cannot upload into someone else''s posts folder'
);

reset role;
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and cmd = 'UPDATE'
     and qual like '%''posts''%'),
  0,
  'no policy lets anyone overwrite an uploaded post photo'
);

select * from finish();
rollback;
