"use server";

import { updateTag } from "next/cache";
import { returnServerError, returnValidationErrors } from "next-safe-action";

import { authActionClient } from "@/lib/safe-action";
import { AVATARS_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

import type { CurrentUser } from "./queries";
import { avatarPathSchema, updateProfileSchema } from "./schemas";
import { profileTag } from "./server/get-public-profile";

const PROFILE_COLUMNS = "id, username, full_name, avatar_path" as const;

function toCurrentUser(row: {
  id: string;
  username: string;
  full_name: string;
  avatar_path: string | null;
}): CurrentUser {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    avatarPath: row.avatar_path,
  };
}

/** Postgres unique_violation: someone else got the username first. */
const UNIQUE_VIOLATION = "23505";

/**
 * Edit name, username and bio. Every action re-checks *who* is calling
 * (ctx.user from a verified JWT) and RLS only lets a user update their own row;
 * the column grants also make the counters untouchable.
 */
export const updateProfileAction = authActionClient
  .metadata({ actionName: "updateProfile" })
  .inputSchema(updateProfileSchema)
  .action(async ({ parsedInput: { fullName, username, bio }, ctx: { user } }) => {
    const supabase = await createClient();

    const { data: current, error: currentError } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    if (currentError) throw currentError;

    const usernameChanged = username !== current.username;
    if (usernameChanged) {
      const { data: available, error } = await supabase.rpc("is_username_available", { username });
      if (error) throw error;
      if (!available) {
        returnValidationErrors(updateProfileSchema, {
          username: { _errors: ["That username isn't available"] },
        });
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, username, bio })
      .eq("id", user.id)
      .select(PROFILE_COLUMNS)
      .single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        returnValidationErrors(updateProfileSchema, {
          username: { _errors: ["That username was just taken. Try another."] },
        });
      }
      throw error;
    }

    // Read-your-own-writes: expire the cached public profile so the very next
    // request renders fresh data. On a rename, both the old URL (now 404) and
    // the new one (possibly cached as "not found") are expired.
    updateTag(profileTag(current.username));
    if (usernameChanged) updateTag(profileTag(username));

    return { profile: toCurrentUser(data) };
  });

/**
 * Point the profile at a freshly uploaded avatar, then delete the old file.
 * The browser uploaded the file itself (straight to Storage, RLS-checked),
 * so the server only receives a path, and verifies it before trusting it.
 */
export const updateAvatarAction = authActionClient
  .metadata({ actionName: "updateAvatar" })
  .inputSchema(avatarPathSchema)
  .action(async ({ parsedInput: { path }, ctx: { user } }) => {
    if (!path.startsWith(`${user.id}/`)) returnServerError("You can only use your own uploads.");

    const supabase = await createClient();
    const bucket = supabase.storage.from(AVATARS_BUCKET);

    const { data: exists } = await bucket.exists(path);
    if (!exists) returnServerError("Upload not found. Please try again.");

    const { data: previous, error: previousError } = await supabase
      .from("profiles")
      .select("username, avatar_path")
      .eq("id", user.id)
      .single();
    if (previousError) throw previousError;

    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar_path: path })
      .eq("id", user.id)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw error;

    // Best effort: an orphaned old file is harmless, so don't fail the request.
    if (previous.avatar_path && previous.avatar_path !== path) {
      const { error: removeError } = await bucket.remove([previous.avatar_path]);
      if (removeError) console.error("[action:updateAvatar] old avatar cleanup", removeError);
    }

    updateTag(profileTag(previous.username));
    return { profile: toCurrentUser(data) };
  });

export const removeAvatarAction = authActionClient
  .metadata({ actionName: "removeAvatar" })
  .action(async ({ ctx: { user } }) => {
    const supabase = await createClient();

    const { data: previous, error: previousError } = await supabase
      .from("profiles")
      .select("username, avatar_path")
      .eq("id", user.id)
      .single();
    if (previousError) throw previousError;

    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar_path: null })
      .eq("id", user.id)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw error;

    if (previous.avatar_path) {
      const { error: removeError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .remove([previous.avatar_path]);
      if (removeError) console.error("[action:removeAvatar] file cleanup", removeError);
    }

    updateTag(profileTag(previous.username));
    return { profile: toCurrentUser(data) };
  });
