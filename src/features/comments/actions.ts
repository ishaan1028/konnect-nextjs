"use server";

import { returnServerError } from "next-safe-action";

import { authActionClient } from "@/lib/safe-action";
import { createClient } from "@/lib/supabase/server";

import type { Comment } from "./queries";
import { addCommentSchema, deleteCommentSchema } from "./schemas";

const FOREIGN_KEY_VIOLATION = "23503";

/**
 * Add a comment. The author comes from the verified session, never the client,
 * and the saved comment is returned so the optimistic one can be replaced.
 * Comments render from the client cache, not the cached post page, so there's
 * nothing to updateTag.
 */
export const addCommentAction = authActionClient
  .metadata({ actionName: "addComment" })
  .inputSchema(addCommentSchema)
  .action(async ({ parsedInput: { postId, body }, ctx: { user } }): Promise<Comment> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: user.id, body })
      .select(
        "id, body, created_at, author:profiles!comments_author_id_fkey!inner(id, username, full_name, avatar_path)",
      )
      .single();

    if (error) {
      if (error.code === FOREIGN_KEY_VIOLATION) returnServerError("That post no longer exists.");
      throw error;
    }

    return {
      id: data.id,
      body: data.body,
      createdAt: data.created_at,
      canDelete: true,
      author: {
        id: data.author.id,
        username: data.author.username,
        fullName: data.author.full_name,
        avatarPath: data.author.avatar_path,
      },
    };
  });

/** Delete a comment: RLS allows its author and the post's owner, nobody else. */
export const deleteCommentAction = authActionClient
  .metadata({ actionName: "deleteComment" })
  .inputSchema(deleteCommentSchema)
  .action(async ({ parsedInput: { commentId } }) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    // RLS filtered it out (not yours, not on your post) or it's already gone.
    if (!data) returnServerError("You can't delete this comment.");
    return { commentId };
  });
