"use server";

import { updateTag } from "next/cache";
import { returnServerError } from "next-safe-action";

import { profileTag } from "@/features/profiles/server/get-public-profile";
import { authActionClient } from "@/lib/safe-action";
import { createClient } from "@/lib/supabase/server";

import { followTargetSchema, removeFollowerSchema } from "./schemas";

const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Follower/following counts are shown on cached public profile pages, so after
 * any change both people's cached profiles are expired (updateTag).
 */
async function expireProfiles(supabase: Supabase, ids: string[]) {
  const { data, error } = await supabase.from("profiles").select("username").in("id", ids);
  if (error) throw error;
  for (const { username } of data) updateTag(profileTag(username));
}

/** Idempotent: following someone you already follow is a no-op, not an error. */
export const followAction = authActionClient
  .metadata({ actionName: "follow" })
  .inputSchema(followTargetSchema)
  .action(async ({ parsedInput: { profileId }, ctx: { user } }) => {
    if (profileId === user.id) returnServerError("You can't follow yourself.");

    const supabase = await createClient();
    // follower_id comes from the verified session, never from the client.
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: profileId });

    if (error && error.code !== UNIQUE_VIOLATION) {
      if (error.code === CHECK_VIOLATION) returnServerError("You can't follow yourself.");
      throw error;
    }

    await expireProfiles(supabase, [user.id, profileId]);
    return { isFollowing: true };
  });

export const unfollowAction = authActionClient
  .metadata({ actionName: "unfollow" })
  .inputSchema(followTargetSchema)
  .action(async ({ parsedInput: { profileId }, ctx: { user } }) => {
    const supabase = await createClient();
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", profileId);
    if (error) throw error;

    await expireProfiles(supabase, [user.id, profileId]);
    return { isFollowing: false };
  });

/** Remove someone from *your* followers (RLS allows the followed side to delete). */
export const removeFollowerAction = authActionClient
  .metadata({ actionName: "removeFollower" })
  .inputSchema(removeFollowerSchema)
  .action(async ({ parsedInput: { followerId }, ctx: { user } }) => {
    const supabase = await createClient();
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", user.id);
    if (error) throw error;

    await expireProfiles(supabase, [user.id, followerId]);
    return { removed: true };
  });
