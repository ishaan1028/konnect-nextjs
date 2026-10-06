import type { SupabaseClient } from "@supabase/supabase-js";
import { infiniteQueryOptions } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

/** A post as a grid tile: the photo and what's needed to lay it out. */
export type PostThumbnail = {
  id: string;
  imagePath: string;
  width: number;
  height: number;
  thumbhash: string | null;
  altText: string;
  createdAt: string;
};

export type PostThumbnailPage = {
  items: PostThumbnail[];
  nextCursor: { createdAt: string; id: string } | null;
};

/** Divisible by 3, so full pages fill whole rows of the grid. */
export const PROFILE_POSTS_PAGE_SIZE = 24;

/** A profile's posts, newest first, a page at a time (keyset pagination). */
export const profilePostsQueryOptions = (supabase: Supabase, profileId: string) =>
  infiniteQueryOptions({
    queryKey: queryKeys.posts.byAuthor(profileId),
    queryFn: async ({ pageParam }): Promise<PostThumbnailPage> => {
      const { data, error } = await supabase.rpc("get_profile_posts", {
        profile_id: profileId,
        cursor_created_at: pageParam?.createdAt,
        cursor_id: pageParam?.id,
        max_results: PROFILE_POSTS_PAGE_SIZE,
      });
      if (error) throw error;

      const items = data.map((row) => ({
        id: row.id,
        imagePath: row.image_path,
        width: row.image_width,
        height: row.image_height,
        // Function return types don't carry nullability; normalize explicitly.
        thumbhash: row.thumbhash ?? null,
        altText: row.alt_text,
        createdAt: row.created_at,
      }));
      const last = items.at(-1);

      return {
        items,
        nextCursor:
          items.length === PROFILE_POSTS_PAGE_SIZE && last
            ? { createdAt: last.createdAt, id: last.id }
            : null,
      };
    },
    initialPageParam: null as PostThumbnailPage["nextCursor"],
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
