/**
 * Seeds the showcase accounts' posts: uploads the photos in
 * supabase/seed/photos/ to Storage and creates the posts and their likes
 * (supabase/seed/posts.json). Runs after `supabase db reset` (pnpm db:reset);
 * safe to run again: existing files, posts and likes are left as they are.
 *
 *   pnpm db:seed-photos
 *
 * It uses the secret key (bypasses RLS), so it only runs against a local
 * Supabase unless --allow-remote is passed.
 */
import { readFile } from "node:fs/promises";

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey)
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
const isLocal = ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
if (!isLocal && !process.argv.includes("--allow-remote")) {
  throw new Error(`Refusing to seed ${url}: pass --allow-remote to seed a hosted project.`);
}

const admin = createClient(url, secretKey, { auth: { persistSession: false } });
const seedDir = new URL("../supabase/seed/", import.meta.url);
const posts = JSON.parse(await readFile(new URL("posts.json", seedDir), "utf8"));
const photos = JSON.parse(await readFile(new URL("photos/photos.json", seedDir), "utf8"));

const usernames = [...new Set(posts.flatMap((post) => [post.author, ...post.likedBy]))];
const { data: profiles, error } = await admin
  .from("profiles")
  .select("id, username")
  .in("username", usernames);
if (error) throw error;
const idOf = (username) => {
  const profile = profiles.find((row) => row.username === username);
  if (!profile) throw new Error(`Seed user @${username} not found: run supabase db reset first.`);
  return profile.id;
};

for (const post of posts) {
  const photo = photos[post.photo];
  const authorId = idOf(post.author);
  const path = `${authorId}/${post.id}.webp`;

  const { error: uploadError } = await admin.storage
    .from("posts")
    .upload(path, await readFile(new URL(`photos/${post.photo}.webp`, seedDir)), {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const { error: postError } = await admin.from("posts").upsert(
    {
      id: post.id,
      author_id: authorId,
      image_path: path,
      image_width: photo.width,
      image_height: photo.height,
      thumbhash: photo.thumbhash,
      caption: post.caption,
      location: post.location,
      alt_text: post.altText,
      created_at: new Date(Date.now() - post.hoursAgo * 3_600_000).toISOString(),
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (postError) throw postError;

  const { error: likesError } = await admin.from("post_likes").upsert(
    post.likedBy.map((username) => ({ post_id: post.id, user_id: idOf(username) })),
    { onConflict: "post_id,user_id", ignoreDuplicates: true },
  );
  if (likesError) throw likesError;
}

console.log(`Seeded ${posts.length} posts with photos.`);
