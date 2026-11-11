/**
 * The username `raw` normalizes to (trimmed, lowercase) if it's well-formed,
 * else null. The same rules as `usernameSchema`, without Zod, for the live
 * availability check while typing; schemas.test.ts keeps the two in step.
 */
export function toValidUsername(raw: string): string | null {
  const username = raw.trim().toLowerCase();
  return /^[a-z0-9._]{3,20}$/.test(username) && !/^\.|\.$|\.\./.test(username) ? username : null;
}
