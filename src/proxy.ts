import { type NextRequest, NextResponse } from "next/server";

import { isAuthPage, isProtectedPath } from "@/lib/auth/routes";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy (formerly "middleware"): runs before every matched request.
 *
 * 1. Keeps the Supabase session fresh (see lib/supabase/proxy.ts).
 * 2. Optimistic redirects: signed-out visitors away from personal pages, and
 *    signed-in users away from the login/sign-up pages. A UX nicety, not
 *    security: authorization happens in the DAL and in Postgres RLS.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!userId && isProtectedPath(pathname)) {
    const login = new URL("/login", request.url);
    // Remember where they were going; login sends them back (sanitized there).
    if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
    return redirectKeepingSession(login, response);
  }

  if (userId && isAuthPage(pathname)) {
    return redirectKeepingSession(new URL("/", request.url), response);
  }

  // Always return the response updateSession built: any other response would
  // drop the refreshed cookies and sign the user out on the next request.
  return response;
}

/**
 * A redirect that still carries the refreshed auth cookies and the no-store
 * cache headers from updateSession, per Supabase's SSR guidance.
 */
function redirectKeepingSession(url: URL, sessionResponse: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of sessionResponse.cookies.getAll()) redirect.cookies.set(cookie);
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = sessionResponse.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
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
