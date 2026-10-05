import type { SupabaseClient } from "@supabase/supabase-js";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

export type FollowListKind = "followers" | "following";

export type FollowStatus = {
  isFollowing: boolean;
  /** They follow the viewer: the button then says "Follow back". */
  isFollowedBy: boolean;
};

/** A person in a followers/following list or in suggestions. */
export type PersonSummary = {
  id: string;
  username: string;
  fullName: string;
  avatarPath: string | null;
};

export type FollowListItem = PersonSummary & {
  followedAt: string;
  /** The viewer follows them. */
  viewerFollows: boolean;
  /** They follow the viewer ("Follow back"). */
  followsViewer: boolean;
};

export type FollowListPage = {
  items: FollowListItem[];
  nextCursor: { followedAt: string; id: string } | null;
};

export type Suggestion = PersonSummary & {
  followersCount: number;
  /** How many people the viewer follows also follow this person. */
  mutualCount: number;
  /** They already follow the viewer ("Follow back"). */
  followsViewer: boolean;
};

const PAGE_SIZE = 20;

export const followStatusQueryOptions = (supabase: Supabase, profileId: string) =>
  queryOptions({
    queryKey: queryKeys.follows.status(profileId),
    queryFn: async (): Promise<FollowStatus> => {
      const { data, error } = await supabase
        .rpc("get_follow_status", { target_id: profileId })
        .single();
      if (error) throw error;
      return { isFollowing: data.is_following, isFollowedBy: data.is_followed_by };
    },
  });

export const followListQueryOptions = (
  supabase: Supabase,
  profileId: string,
  kind: FollowListKind,
) =>
  infiniteQueryOptions({
    queryKey: queryKeys.follows.list(profileId, kind),
    queryFn: async ({ pageParam }): Promise<FollowListPage> => {
      const { data, error } = await supabase.rpc("get_follow_list", {
        profile_id: profileId,
        list_kind: kind,
        cursor_followed_at: pageParam?.followedAt,
        cursor_id: pageParam?.id,
        max_results: PAGE_SIZE,
      });
      if (error) throw error;

      const items = data.map((row) => ({
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        // Function return types don't carry nullability; normalize explicitly.
        avatarPath: row.avatar_path ?? null,
        followedAt: row.followed_at,
        viewerFollows: row.viewer_follows,
        followsViewer: row.follows_viewer,
      }));
      const last = items.at(-1);

      return {
        items,
        // A full page means there may be more; the cursor is the last row.
        nextCursor:
          items.length === PAGE_SIZE && last ? { followedAt: last.followedAt, id: last.id } : null,
      };
    },
    initialPageParam: null as FollowListPage["nextCursor"],
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

export const followSuggestionsQueryOptions = (supabase: Supabase, limit = 5) =>
  queryOptions({
    queryKey: queryKeys.follows.suggestions(),
    queryFn: async (): Promise<Suggestion[]> => {
      const { data, error } = await supabase.rpc("get_follow_suggestions", {
        max_results: limit,
      });
      if (error) throw error;
      return data.map((row) => ({
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        avatarPath: row.avatar_path ?? null,
        followersCount: row.followers_count,
        mutualCount: row.mutual_count,
        followsViewer: row.follows_viewer,
      }));
    },
    // Every home visit still refreshes them in the background (the server's
    // prefetch). The longer staleTime only skips refetching on window focus,
    // so someone you just followed doesn't vanish from under the cursor.
    staleTime: 5 * 60 * 1000,
  });
