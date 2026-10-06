import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { profileTag } from "@/features/profiles/server/get-public-profile";
import { createPublicClient } from "@/lib/supabase/public";

import { postIdSchema } from "../schemas";

export type PostDetail = {
  id: string;
  imagePath: string;
  width: number;
  height: number;
  thumbhash: string | null;
  altText: string;
  caption: string;
  location: string;
  createdAt: string;
  author: { id: string; username: string; fullName: string; avatarPath: string | null };
};

/** Cache tag for one post: edits and deletes expire it with updateTag. */
export const postTag = (postId: string) => `post:${postId}`;

/**
 * A post as any visitor sees it, cached across requests and users (it never
 * depends on who's asking: the public client has no cookies).
 *
 * It's also tagged with its author's profile, so renaming or changing your
 * photo (which expire that tag) refreshes your posts' headers too.
 */
export async function getPost(postId: string): Promise<PostDetail | null> {
  "use cache";
  cacheTag(postTag(postId));
  cacheLife("hours");

  // Not a UUID? It can't be a post (and would be a database error otherwise).
  if (!postIdSchema.safeParse(postId).success) return null;

  const { data, error } = await createPublicClient()
    .from("posts")
    .select(
      "id, image_path, image_width, image_height, thumbhash, alt_text, caption, location, created_at, author:profiles!inner(id, username, full_name, avatar_path)",
    )
    .eq("id", postId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  cacheTag(profileTag(data.author.username));

  return {
    id: data.id,
    imagePath: data.image_path,
    width: data.image_width,
    height: data.image_height,
    thumbhash: data.thumbhash,
    altText: data.alt_text,
    caption: data.caption,
    location: data.location,
    createdAt: data.created_at,
    author: {
      id: data.author.id,
      username: data.author.username,
      fullName: data.author.full_name,
      avatarPath: data.author.avatar_path,
    },
  };
}
