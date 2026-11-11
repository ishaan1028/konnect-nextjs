import type { SupabaseClient } from "@supabase/supabase-js";
import { infiniteQueryOptions } from "@tanstack/react-query";

import { nextCursor, type PostCursor } from "@/features/posts/queries";
import { queryKeys } from "@/lib/query/keys";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; username: string; fullName: string; avatarPath: string | null };
  /** The viewer wrote it, or it's on the viewer's post. */
  canDelete: boolean;
  /** Shown optimistically while the server saves it (it has a temporary id). */
  pending?: boolean;
};

export type CommentsPage = { items: Comment[]; nextCursor: PostCursor };

export const COMMENTS_PAGE_SIZE = 20;

/** A post's comments, newest first, a page at a time ("View older comments"). */
export const commentsQueryOptions = (supabase: Supabase, postId: string) =>
  infiniteQueryOptions({
    queryKey: queryKeys.comments.thread(postId),
    queryFn: async ({ pageParam }): Promise<CommentsPage> => {
      const { data, error } = await supabase.rpc("get_post_comments", {
        post_id: postId,
        cursor_created_at: pageParam?.createdAt,
        cursor_id: pageParam?.id,
        max_results: COMMENTS_PAGE_SIZE,
      });
      if (error) throw error;

      const items = data.map((row) => ({
        id: row.id,
        body: row.body,
        createdAt: row.created_at,
        canDelete: row.can_delete,
        author: {
          id: row.author_id,
          username: row.author_username,
          fullName: row.author_full_name,
          avatarPath: row.author_avatar_path ?? null,
        },
      }));
      return { items, nextCursor: nextCursor(items, COMMENTS_PAGE_SIZE) };
    },
    initialPageParam: null as PostCursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
