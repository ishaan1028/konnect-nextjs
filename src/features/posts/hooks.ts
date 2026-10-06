"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { unwrapActionResult } from "@/lib/action-result";
import { queryKeys } from "@/lib/query/keys";

import { likePostAction, unlikePostAction } from "./actions";
import type { LikeStatus } from "./queries";

/**
 * Like / unlike with an optimistic update. Every Like button and count for
 * the post reads the same cache entry, so a like in the feed shows up in the
 * post's modal and page too.
 *
 *   onMutate  → flip the heart and the count at once (remember the old state)
 *   action    → write the like; returns the real state
 *   onSuccess → settle on the server's answer (other people's likes included)
 *   onError   → roll back and explain
 */
export function useToggleLike(postId: string) {
  const queryClient = useQueryClient();
  const statusKey = queryKeys.likes.status(postId);

  const mutationKey = ["toggle-like", postId];

  return useMutation({
    mutationKey,
    mutationFn: async (like: boolean) =>
      unwrapActionResult(await (like ? likePostAction : unlikePostAction)({ postId })),

    onMutate: async (like) => {
      await queryClient.cancelQueries({ queryKey: statusKey });
      const previous = queryClient.getQueryData<LikeStatus>(statusKey);
      if (previous && previous.liked !== like) {
        queryClient.setQueryData<LikeStatus>(statusKey, {
          liked: like,
          count: Math.max(0, previous.count + (like ? 1 : -1)),
        });
      }
      return { previous };
    },

    onSuccess: (status) => {
      // With rapid clicks, only the last toggle's answer is current: an
      // earlier one would briefly undo the newer optimistic state.
      if (queryClient.isMutating({ mutationKey }) === 1) {
        queryClient.setQueryData<LikeStatus>(statusKey, status);
      }
    },

    onError: (error, _like, context) => {
      queryClient.setQueryData(statusKey, context?.previous);
      toast.error(error.message);
    },

    onSettled: () => {
      // Explore tiles show counts; mark them stale without refetching now.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posts.explore(),
        refetchType: "none",
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.likes.likers(postId) });
    },
  });
}
