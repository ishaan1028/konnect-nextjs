import type { SupabaseClient } from "@supabase/supabase-js";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import type { PostThumbnail } from "@/features/posts/queries";
import { queryKeys } from "@/lib/query/keys";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

/** Whether the viewer saved a post (false when signed out: saves are private). */
export const savedStatusQueryOptions = (supabase: Supabase, postId: string) =>
  queryOptions({
    queryKey: queryKeys.saved.status(postId),
    queryFn: async (): Promise<boolean> => {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) return false;
      // RLS only returns the viewer's own rows.
      const { data, error } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("post_id", postId)
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    },
    // Feed cards seed this from their page (like the like state).
    staleTime: 60 * 1000,
  });

export type SavedPost = PostThumbnail & { authorUsername: string; savedAt: string };

export type SavedPostsPage = {
  items: SavedPost[];
  nextCursor: { savedAt: string; id: string } | null;
};

/** Divisible by 3, so full pages fill whole rows of the grid. */
export const SAVED_POSTS_PAGE_SIZE = 24;

/** The viewer's saved posts, newest saved first. */
export const savedPostsQueryOptions = (supabase: Supabase) =>
  infiniteQueryOptions({
    queryKey: queryKeys.saved.list(),
    queryFn: async ({ pageParam }): Promise<SavedPostsPage> => {
      const { data, error } = await supabase.rpc("get_saved_posts", {
        cursor_saved_at: pageParam?.savedAt,
        cursor_id: pageParam?.id,
        max_results: SAVED_POSTS_PAGE_SIZE,
      });
      if (error) throw error;

      const items = data.map((row) => ({
        id: row.id,
        imagePath: row.image_path,
        width: row.image_width,
        height: row.image_height,
        thumbhash: row.thumbhash ?? null,
        altText: row.alt_text,
        createdAt: row.created_at,
        authorUsername: row.author_username,
        savedAt: row.saved_at,
      }));
      const last = items.at(-1);
      return {
        items,
        nextCursor:
          items.length === SAVED_POSTS_PAGE_SIZE && last
            ? { savedAt: last.savedAt, id: last.id }
            : null,
      };
    },
    initialPageParam: null as SavedPostsPage["nextCursor"],
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
