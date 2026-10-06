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
  posts: {
    all: ["posts"] as const,
    byAuthor: (profileId: string) => ["posts", "by-author", profileId] as const,
    feed: () => ["posts", "feed"] as const,
    explore: () => ["posts", "explore"] as const,
    detail: (postId: string) => ["posts", "detail", postId] as const,
  },
  // Not under "posts": invalidating every post list (after sharing a post)
  // shouldn't refetch the like state of every post on screen.
  likes: {
    status: (postId: string) => ["likes", "status", postId] as const,
    likers: (postId: string) => ["likes", "likers", postId] as const,
  },
  search: {
    profiles: (query: string) => ["search", "profiles", query] as const,
  },
};
