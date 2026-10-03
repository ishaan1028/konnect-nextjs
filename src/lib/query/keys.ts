/**
 * Every query key in the app, in one place.
 *
 * Invalidation is by prefix: invalidating ["profiles"] also hits
 * ["profiles", "alex.demo"]. Centralizing keys keeps reads and invalidations
 * from drifting apart. Phases add their keys here.
 */
export const queryKeys = {
  currentUser: ["current-user"] as const,
};
