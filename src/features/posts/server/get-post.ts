import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { profileTag } from "@/features/profiles/server/get-public-profile";
import { createPublicClient } from "@/lib/supabase/public";

import { POST_DETAIL_COLUMNS, type PostDetail, toPostDetail } from "../post-detail";
import { postIdSchema } from "../schemas";

export type { PostDetail };

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
    .select(POST_DETAIL_COLUMNS)
    .eq("id", postId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  cacheTag(profileTag(data.author.username));
  return toPostDetail(data);
}
