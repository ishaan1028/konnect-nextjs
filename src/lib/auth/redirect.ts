import type { Route } from "next";

/**
 * Returns `next` only if it's a same-site path, otherwise `fallback`.
 *
 * `?next=` comes from the URL, so it's attacker-controlled. Without this check,
 * /login?next=https://evil.example would send a freshly signed-in user to a
 * phishing page (an "open redirect"). Protocol-relative URLs like
 * "//evil.example" and backslash tricks ("/\evil.example") are rejected too,
 * because browsers treat them as other origins.
 *
 * Returns a typed `Route`: this function is the one place where an untrusted
 * string is checked and then allowed into redirect() / router.push().
 */
export function safeNextPath(next: string | null | undefined, fallback: Route = "/"): Route {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }

  // Resolve against a dummy origin: anything that escapes it is not a local path.
  try {
    const url = new URL(next, "http://konnect.local");
    if (url.origin !== "http://konnect.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}` as Route;
  } catch {
    return fallback;
  }
}
