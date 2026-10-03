import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy (formerly "middleware"): runs before every matched request.
 *
 * For now it only keeps the Supabase session fresh. Phase 4 adds *optimistic*
 * redirects (e.g. signed-out users away from the feed). Those are a UX nicety,
 * not security: real authorization happens in the Data Access Layer
 * (lib/dal.ts) and in Postgres Row Level Security.
 */
export async function proxy(request: NextRequest) {
  const { response } = await updateSession(request);
  // Always return the response updateSession built: any other response would
  // drop the refreshed cookies and sign the user out on the next request.
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimization.
     * Prefetches are deliberately NOT skipped: they render Server Components,
     * and if those had to refresh an expired token themselves (they can't save
     * cookies), the single-use refresh token would be burned and the user
     * signed out at random.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
