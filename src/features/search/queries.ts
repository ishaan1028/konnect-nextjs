import type { SupabaseClient } from "@supabase/supabase-js";
import { queryOptions } from "@tanstack/react-query";

import type { PersonSummary } from "@/features/follows/queries";
import { queryKeys } from "@/lib/query/keys";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

export type ProfileSearchResult = PersonSummary & {
  followersCount: number;
  viewerFollows: boolean;
  followsViewer: boolean;
};

const MAX_RESULTS = 20;

/** People whose username or name contains the query (pg_trgm-indexed). */
export const searchProfilesQueryOptions = (supabase: Supabase, query: string) =>
  queryOptions({
    queryKey: queryKeys.search.profiles(query),
    queryFn: async (): Promise<ProfileSearchResult[]> => {
      const { data, error } = await supabase.rpc("search_profiles", {
        query,
        max_results: MAX_RESULTS,
      });
      if (error) throw error;
      return data.map((row) => ({
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        avatarPath: row.avatar_path ?? null,
        followersCount: row.followers_count,
        viewerFollows: row.viewer_follows,
        followsViewer: row.follows_viewer,
      }));
    },
    // Retyping a query shows the earlier answer at once; people don't change fast.
    staleTime: 30 * 1000,
  });
