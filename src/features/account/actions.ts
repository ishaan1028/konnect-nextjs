"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { returnValidationErrors } from "next-safe-action";

import { ownAccountActionClient } from "@/lib/safe-action";
import { AVATARS_BUCKET, POSTS_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { deleteAccountSchema } from "./schemas";

/** Removes every file in a user's folder (`<uid>/…`), a page at a time. */
async function removeFolder(admin: SupabaseClient, bucket: string, folder: string) {
  const storage = admin.storage.from(bucket);
  for (;;) {
    const { data: files, error } = await storage.list(folder, { limit: 1000 });
    if (error) throw error;
    if (files.length === 0) return;
    const { data: removed, error: removeError } = await storage.remove(
      files.map((file) => `${folder}/${file.name}`),
    );
    if (removeError) throw removeError;
    // Nothing removed would loop forever: fail loudly instead.
    if (removed.length === 0) throw new Error(`Couldn't remove files from ${bucket}/${folder}`);
  }
}

/**
 * Permanently deletes the signed-in account. Files first (they aren't rows,
 * so nothing cascades to them; if this fails the account is still there to
 * retry), then the auth user: ON DELETE CASCADE removes the profile, posts,
 * likes, comments and follows, and chats keep their messages from a
 * "Deleted user". The demo account is refused (ownAccountActionClient).
 */
export const deleteAccountAction = ownAccountActionClient
  .metadata({ actionName: "deleteAccount" })
  .inputSchema(deleteAccountSchema)
  .action(async ({ parsedInput: { username }, ctx: { user } }) => {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single()
      .throwOnError();
    if (username !== profile.username) {
      returnValidationErrors(deleteAccountSchema, {
        username: { _errors: ["That's not your username"] },
      });
    }

    // The admin client is only used after the caller is verified as this user.
    const admin = createAdminClient();
    await removeFolder(admin, AVATARS_BUCKET, user.id);
    await removeFolder(admin, POSTS_BUCKET, user.id);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    // Their sessions went with the user; this clears the cookies.
    await supabase.auth.signOut({ scope: "local" });
    // Their profile, posts and the counts they touched are in cached pages.
    revalidatePath("/", "layout");
    redirect("/login");
  });
