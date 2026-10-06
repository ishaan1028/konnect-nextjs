import nextEnv from "@next/env";

import { adminClient } from "./support/users";

/**
 * Deletes every account the tests created (usernames start with "e2e_"), so
 * runs don't pile test users and posts into the local app you use by hand.
 * Deleting the auth user cascades to the profile, posts, likes and follows;
 * Storage files aren't rows, so they're removed through the Storage API first.
 */
export default async function globalTeardown() {
  nextEnv.loadEnvConfig(process.cwd());
  const admin = adminClient();

  const { data: users, error } = await admin
    .from("profiles")
    .select("id")
    .like("username", "e2e\\_%");
  if (error) throw error;

  for (const { id } of users) {
    for (const bucket of ["avatars", "posts"]) {
      const { data: files } = await admin.storage.from(bucket).list(id);
      if (files?.length) {
        await admin.storage.from(bucket).remove(files.map((file) => `${id}/${file.name}`));
      }
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(id);
    if (deleteError)
      console.warn(`[teardown] couldn't delete test user ${id}:`, deleteError.message);
  }
  if (users.length) process.stdout.write(`[teardown] removed ${users.length} test accounts\n`);
}
