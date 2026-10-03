import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Cookie-less Supabase client that acts as an anonymous visitor.
 *
 * For public data inside `"use cache"` functions: a cached result is shared by
 * everyone, so it must never depend on who's asking. This client can't read
 * cookies, so it physically can't fetch anything a signed-out visitor
 * couldn't see (RLS applies as the `anon` role).
 */
export function createPublicClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
