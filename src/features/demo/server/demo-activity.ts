import "server-only";

import { revalidateTag } from "next/cache";

import { findUserByEmail } from "@/features/auth/server/find-user-by-email";
import { postTag } from "@/features/posts/server/get-post";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/** The showcase people (supabase/seed.sql) who keep the demo account busy. */
const PEOPLE = ["maya.k", "arjun.codes", "zoe.travels", "leo.bakes", "sana.draws"];

// The job recognizes (and later removes) its own comments and messages by
// these exact texts, so it never touches anything a person wrote.
export const COMMENTS = [
  "This is such a good shot 😍",
  "Okay, now I need to go here.",
  "The colors in this one 🔥",
  "Saving this for inspiration!",
  "How did you get this light?",
  "Love this one, Dario 👏",
];
export const MESSAGES = [
  "Hey! Saw your latest post, so good 😄",
  "Coffee this weekend? ☕",
  "Did you try that place I sent you?",
  "Just landed, catch up later? ✈️",
  "Sending you the photos from Saturday 📸",
  "How's your week going?",
];

/** Comments and messages from the job are removed after this, so they never pile up. */
const KEEP_MS = 7 * 24 * 3_600_000;

/** A random item; callers check the list isn't empty. */
const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

/**
 * One day of activity on the shared demo account, as the showcase people: a
 * like and a comment on Dario's posts, a direct message, and sometimes a
 * follow. Each one fires the app's own triggers, so visitors see fresh
 * notifications and an unread chat. It also keeps the free Supabase project
 * from pausing for inactivity. Run daily by Vercel Cron (vercel.json).
 */
export async function runDemoActivity() {
  if (!env.DEMO_USER_EMAIL) return { skipped: "No demo account is configured." };
  const admin = createAdminClient();
  const demo = await findUserByEmail(admin, env.DEMO_USER_EMAIL);
  if (!demo) return { skipped: "The demo account doesn't exist." };

  const { data: people, error: peopleError } = await admin
    .from("profiles")
    .select("id, username")
    .in("username", PEOPLE);
  if (peopleError) throw peopleError;
  if (!people.length) return { skipped: "None of the showcase people exist." };
  const peopleIds = people.map((person) => person.id);

  const { data: posts, error: postsError } = await admin
    .from("posts")
    .select("id")
    .eq("author_id", demo.id);
  if (postsError) throw postsError;

  const cutoff = new Date(Date.now() - KEEP_MS).toISOString();
  const done: string[] = [];

  // Likes and comments need a post of Dario's: visitors share the account and
  // may have deleted them all.
  if (posts.length) {
    const liker = pick(people);
    const liked = pick(posts);
    // Taking an existing like back first makes its notification fresh again.
    const { error: unlikeError } = await admin
      .from("post_likes")
      .delete()
      .match({ post_id: liked.id, user_id: liker.id });
    if (unlikeError) throw unlikeError;
    const { error: likeError } = await admin
      .from("post_likes")
      .insert({ post_id: liked.id, user_id: liker.id });
    if (likeError) throw likeError;
    done.push(`${liker.username} liked a post`);

    const commenter = pick(people);
    const commented = pick(posts);
    const { error: commentError } = await admin
      .from("comments")
      .insert({ post_id: commented.id, author_id: commenter.id, body: pick(COMMENTS) });
    if (commentError) throw commentError;
    done.push(`${commenter.username} commented`);

    const { error: cleanupError } = await admin
      .from("comments")
      .delete()
      .in(
        "post_id",
        posts.map((post) => post.id),
      )
      .in("author_id", peopleIds)
      .in("body", COMMENTS)
      .lt("created_at", cutoff);
    if (cleanupError) throw cleanupError;

    // The post page caches its like and comment counts.
    for (const id of new Set([liked.id, commented.id])) revalidateTag(postTag(id), "max");
  }

  const sender = pick(people);
  const conversationId = await directConversation(admin, sender.id, demo.id);
  const { error: messageError } = await admin
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: sender.id, body: pick(MESSAGES) });
  if (messageError) throw messageError;
  done.push(`${sender.username} sent a message`);

  const { error: oldMessagesError } = await admin
    .from("messages")
    .delete()
    .in("sender_id", peopleIds)
    .in("body", MESSAGES)
    .lt("created_at", cutoff);
  if (oldMessagesError) throw oldMessagesError;

  // Every other day or so, someone who already follows Dario follows again
  // (unfollow, then follow): a fresh notification, same follower count.
  if (Math.random() < 0.5) {
    const { data: followers, error: followersError } = await admin
      .from("follows")
      .select("follower_id")
      .eq("following_id", demo.id)
      .in("follower_id", peopleIds);
    if (followersError) throw followersError;
    if (followers.length) {
      const { follower_id } = pick(followers);
      const follow = { follower_id, following_id: demo.id };
      const { error: unfollowError } = await admin.from("follows").delete().match(follow);
      if (unfollowError) throw unfollowError;
      const { error: followError } = await admin.from("follows").insert(follow);
      if (followError) throw followError;
      done.push(`${people.find((person) => person.id === follower_id)?.username} followed`);
    }
  }

  return { done };
}

/** The direct conversation between two people, created the way get_or_create_dm does. */
async function directConversation(
  admin: ReturnType<typeof createAdminClient>,
  a: string,
  b: string,
) {
  // Same key as get_or_create_dm: least(uuid) ':' greatest(uuid). Lowercase
  // UUID strings sort the same as the uuid type.
  const dmKey = [a, b].sort().join(":");
  const { data: existing, error } = await admin
    .from("conversations")
    .select("id")
    .eq("dm_key", dmKey)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing.id;

  const { data: created, error: createError } = await admin
    .from("conversations")
    .insert({ dm_key: dmKey })
    .select("id")
    .single();
  if (createError) throw createError;
  const { error: participantsError } = await admin.from("conversation_participants").insert([
    { conversation_id: created.id, user_id: a },
    { conversation_id: created.id, user_id: b },
  ]);
  if (participantsError) throw participantsError;
  return created.id;
}
