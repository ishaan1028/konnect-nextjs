/*
 * Route access rules used by the proxy for *optimistic* redirects.
 * They improve UX (no flash of a page you can't use); they are not security.
 * Data is protected by the Data Access Layer and Row Level Security.
 */

/** Pages that only make sense signed in. Signed-out visitors go to /login. */
const PROTECTED_PREFIXES = ["/explore", "/create", "/messages", "/saved", "/settings"] as const;

/** Pages for signed-out visitors. Signed-in users are sent to the feed. */
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"] as const;

const matches = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export function isProtectedPath(pathname: string): boolean {
  // The home feed is personal. Profiles (/[username]) and posts (/p/[id]) stay
  // public, like public accounts on Instagram, so they can be shared and indexed.
  return pathname === "/" || PROTECTED_PREFIXES.some((prefix) => matches(pathname, prefix));
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((page) => matches(pathname, page));
}
