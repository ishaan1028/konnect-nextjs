import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { isSignedOutError } from "@/lib/auth/claims";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Refreshes the Supabase session on every matched request.
 *
 * Server Components can't write cookies, so without this an expired access
 * token could never be renewed and users would be signed out after an hour.
 * The refreshed token is written to:
 * 1. the *request* cookies, so Server Components rendering this request see it;
 * 2. the *response* cookies, so the browser stores it for the next request.
 *
 * Returns the response to send, plus the verified user id: null when signed
 * out, undefined when it couldn't be determined (a failure, e.g. a network
 * hiccup), in which case nothing should be inferred from it.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          // Rebuild the response so it carries the updated request cookies.
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Cache-Control/Expires/Pragma: a CDN must never cache a response that
          // sets auth cookies, or one user's session could be served to another.
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    },
  );

  // Don't put code between creating the client and getClaims(): getClaims()
  // verifies the JWT signature (never trust getSession() on the server) and
  // refreshes the session when the token is about to expire.
  const { data, error } = await supabase.auth.getClaims();
  const userId: string | null | undefined =
    error && !isSignedOutError(error) ? undefined : (data?.claims.sub ?? null);

  return { response, userId };
}
