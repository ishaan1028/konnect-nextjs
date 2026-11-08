import "server-only";

import type { User } from "@supabase/supabase-js";

import type { createAdminClient } from "@/lib/supabase/admin";

/** The Auth user with this email, or null. Needs the admin client. */
export async function findUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<User | null> {
  // shortcut: pages through all users (the Auth admin API can't look up by email); fine for a few thousand accounts, use a SQL lookup beyond that.
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
}
