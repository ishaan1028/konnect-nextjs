import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

import type { PostThumbnail } from "../queries";
import { postTag } from "./get-post";

export type PopularPost = PostThumbnail & {
  authorUsername: string;
  likesCount: number;
  commentsCount: number;
};

/**
 * The most-liked posts, shared by everyone and cached for minutes. Each post's
 * own tag is attached too, so deleting one (updateTag(postTag)) drops it at once.
 */
export async function getPopularPosts(): Promise<PopularPost[]> {
  "use cache";
  cacheLife("minutes");

  const { data, error } = await createPublicClient()
    .from("posts")
    .select(
      "id, image_path, image_width, image_height, thumbhash, alt_text, created_at, likes_count, comments_count, author:profiles!posts_author_id_fkey(username)",
    )
    .order("likes_count", { ascending: false })
    .order("comments_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);
  if (error) throw error;

  for (const post of data) cacheTag(postTag(post.id));
  return data.map((post) => ({
    id: post.id,
    imagePath: post.image_path,
    width: post.image_width,
    height: post.image_height,
    thumbhash: post.thumbhash,
    altText: post.alt_text,
    createdAt: post.created_at,
    authorUsername: post.author.username,
    likesCount: post.likes_count,
    commentsCount: post.comments_count,
  }));
}
