import { env } from "@/lib/env";

export const AVATARS_BUCKET = "avatars";
export const POSTS_BUCKET = "posts";

/**
 * Public URL of a file in a public bucket. Pure string building (no client or
 * network call), so it works in Server and Client Components alike.
 */
export function publicStorageUrl(bucket: string, path: string): string {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export function avatarUrl(path: string | null | undefined): string | null {
  return path ? publicStorageUrl(AVATARS_BUCKET, path) : null;
}

export function postImageUrl(path: string): string {
  return publicStorageUrl(POSTS_BUCKET, path);
}
