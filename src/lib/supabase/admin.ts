import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Admin client: uses the secret key and BYPASSES Row Level Security.
 *
 * Only for trusted, server-side jobs that must act beyond one user's
 * permissions (e.g. deleting an account and its storage in phase 12).
 * `server-only` makes the build fail if a Client Component ever imports it.
 * Always authorize the caller yourself before using it.
 */
export function createAdminClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      // No user session: this client never signs in or refreshes tokens.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
