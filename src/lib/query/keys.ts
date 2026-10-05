/**
 * Every query key in the app, in one place.
 *
 * Invalidation is by prefix: invalidating ["follows"] also hits
 * ["follows", "status", id] and ["follows", "list", …]. Centralizing keys keeps
 * reads and invalidations from drifting apart. Phases add their keys here.
 */
export const queryKeys = {
  currentUser: ["current-user"] as const,
  profileId: (username: string) => ["profile-id", username] as const,
  follows: {
    all: ["follows"] as const,
    status: (profileId: string) => ["follows", "status", profileId] as const,
    lists: () => ["follows", "list"] as const,
    list: (profileId: string, kind: "followers" | "following") =>
      ["follows", "list", profileId, kind] as const,
    suggestions: () => ["follows", "suggestions"] as const,
  },
};
