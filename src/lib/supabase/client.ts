import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/public-env";
import type { Database } from "@/types/database.types";

/**
 * Supabase client for Client Components (runs in the browser).
 *
 * - Uses the publishable key: it can only do what RLS policies allow.
 * - Stores the session in cookies (not localStorage), so the server sees the
 *   same signed-in user on the next request.
 * - createBrowserClient returns a singleton, so calling this repeatedly is cheap.
 */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
