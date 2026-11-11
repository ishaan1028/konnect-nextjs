/** A URL segment, decoded once. A malformed escape (`/%E0`) gives "", which names no one. */
export function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return "";
  }
}

/** The username a profile URL names. Usernames are stored lowercase, so /Maya.K is maya.k. */
export const usernameFromSegment = (segment: string) => decodeSegment(segment).toLowerCase();
