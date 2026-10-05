/** Shown wherever the shared demo account tries to change its identity. */
export const DEMO_READ_ONLY_MESSAGE =
  "The demo account is shared, so its profile can't be changed. Create your own account to make it yours.";

/**
 * Whether verified JWT claims belong to a demo account (app_metadata.demo).
 * app_metadata is only writable server-side, so users can't set it on
 * themselves. Postgres RLS enforces the same rule independently.
 */
export function isDemoClaims(claims: { app_metadata?: Record<string, unknown> }): boolean {
  return claims.app_metadata?.demo === true;
}
