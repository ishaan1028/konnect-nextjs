"use client";

import { type InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { unwrapActionResult } from "@/lib/action-result";
import { queryKeys } from "@/lib/query/keys";

import { followAction, removeFollowerAction, unfollowAction } from "./actions";
import type { FollowListPage, FollowStatus } from "./queries";

/**
 * Follow / unfollow with an optimistic update:
 *   onMutate  → flip the button immediately (remember the previous state)
 *   action    → the Server Action writes the row; updateTag refreshes counts
 *   onError   → roll back and explain
 *   onSettled → mark lists and the feed stale so they refetch with the truth
 */
export function useToggleFollow(profileId: string) {
  const queryClient = useQueryClient();
  const statusKey = queryKeys.follows.status(profileId);

  return useMutation({
    mutationFn: async (follow: boolean) =>
      unwrapActionResult(await (follow ? followAction : unfollowAction)({ profileId })),

    onMutate: async (follow) => {
      // Stop any in-flight fetch from overwriting the optimistic value.
      await queryClient.cancelQueries({ queryKey: statusKey });
      const previous = queryClient.getQueryData<FollowStatus>(statusKey);
      queryClient.setQueryData<FollowStatus>(statusKey, {
        isFollowing: follow,
        isFollowedBy: previous?.isFollowedBy ?? false,
      });
      return { previous };
    },

    onError: (error, _follow, context) => {
      queryClient.setQueryData(statusKey, context?.previous);
      toast.error(error.message);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.follows.lists() });
      // Their posts join (or leave) your feed.
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed() });
      // Mark suggestions stale without refetching now: the person just followed
      // stays in the list (showing "Following") instead of vanishing mid-click.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.follows.suggestions(),
        refetchType: "none",
      });
    },
  });
}

/** Remove someone from your followers, then drop them from the cached list. */
export function useRemoveFollower(profileId: string) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.follows.list(profileId, "followers");

  return useMutation({
    mutationFn: async (followerId: string) =>
      unwrapActionResult(await removeFollowerAction({ followerId })),

    onSuccess: (_data, followerId) => {
      queryClient.setQueryData<InfiniteData<FollowListPage>>(listKey, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.filter((item) => item.id !== followerId),
              })),
            }
          : old,
      );
      toast.success("Follower removed");
    },

    onError: (error) => toast.error(error.message),
  });
}
