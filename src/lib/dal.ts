import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer (DAL): the one place server code asks "who is this?".
 *
 * Every Server Component, Server Action and Route Handler that needs the user
 * goes through here, so authorization lives close to the data, never only in
 * the proxy (which is just an optimistic redirect) or in the UI.
 */

/** The minimal, verified identity we pass around. Never the raw session. */
export type SessionUser = {
  id: string;
  email: string | null;
};

/**
 * Returns the signed-in user, or null.
 *
 * - getClaims() verifies the JWT signature (locally, against the project's
 *   public keys), so a forged cookie can't impersonate anyone. Never use
 *   getSession() for this on the server: it trusts the cookie as-is.
 * - React's cache() dedupes calls within one request: ten components can ask
 *   and the token is verified once.
 * - Reads cookies, so callers must render inside <Suspense> (Cache Components).
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) return null;

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
});

/** For pages and actions that only make sense signed in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  // The proxy already redirects signed-out visitors with ?next=; this is the
  // safety net for anything it doesn't cover (it must never be the only check).
  if (!user) redirect("/login");
  return user;
}
