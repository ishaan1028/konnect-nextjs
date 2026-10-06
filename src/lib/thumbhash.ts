import { thumbHashToDataURL } from "thumbhash";

/*
 * ThumbHash: a ~25-byte summary of an image (colors, shape, alpha) that
 * decodes to a soft, blurred preview. Stored as base64 next to each post, so
 * pages can paint a placeholder with zero extra requests while the real photo
 * loads. Pure JS, so it works in Server and Client Components alike.
 */

export function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/** A data: URL for next/image's `placeholder`, or "empty" without a hash. */
export function thumbhashPlaceholder(hash: string | null): `data:image/${string}` | "empty" {
  if (!hash) return "empty";
  try {
    const bytes = Uint8Array.from(atob(hash), (char) => char.charCodeAt(0));
    return thumbHashToDataURL(bytes) as `data:image/${string}`;
  } catch {
    return "empty";
  }
}
