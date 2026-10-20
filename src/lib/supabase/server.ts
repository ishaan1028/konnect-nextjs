import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

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
 *
 * connection() first: some prerenders (dev validation, runtime prefetches) do
 * get cookies, but forbid reading the clock. Supabase checks the session's
 * expiry with Date.now(), which then throws inside getClaims(); it reports
 * "no user", and the prerendered HTML shows a signed-in visitor as signed out
 * (a hydration mismatch). Waiting for the real request keeps every session
 * read, and TanStack's dehydrate() after it (which stamps Date.now() too), out
 * of prerendering entirely.
 */
export async function createClient() {
  await connection();
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
