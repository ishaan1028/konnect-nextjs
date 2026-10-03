import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Create a new one per request (it's cheap): it's bound to *this* request's
 * cookies, so it acts as the signed-in user and RLS applies to them.
 *
 * With Cache Components, reading cookies() is request-time data, so components
 * that use this client must render inside a <Suspense> boundary.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components can't write cookies; that's fine because the
            // proxy (src/proxy.ts) already refreshed the session for this request.
            // Server Actions and Route Handlers *can* write, so this succeeds there.
          }
        },
      },
    },
  );
}
