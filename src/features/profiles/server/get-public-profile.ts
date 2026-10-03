import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

export type PublicProfile = {
  id: string;
  username: string;
  fullName: string;
  bio: string;
  avatarPath: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
};

/** Cache tag for everything rendered from one profile. */
export const profileTag = (username: string) => `profile:${username}`;

/**
 * A profile as any visitor sees it, cached across requests and users.
 *
 * - "use cache": the result is shared by everyone, so it must not depend on
 *   who's asking. The cookie-less public client guarantees that.
 * - cacheTag: profile edits call updateTag(profileTag(username)) in their
 *   Server Action, so the owner sees their change on the very next request.
 * - cacheLife("hours"): otherwise served from cache and refreshed in the
 *   background at most every few hours.
 * - The arguments become part of the cache key (stored in plain text), which
 *   is fine here: a username is public.
 */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  "use cache";
  cacheTag(profileTag(username));
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("profiles")
    .select(
      "id, username, full_name, bio, avatar_path, followers_count, following_count, posts_count",
    )
    .eq("username", username)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    fullName: data.full_name,
    bio: data.bio,
    avatarPath: data.avatar_path,
    followersCount: data.followers_count,
    followingCount: data.following_count,
    postsCount: data.posts_count,
  };
}
