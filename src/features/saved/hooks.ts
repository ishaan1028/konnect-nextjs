"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { unwrapActionResult } from "@/lib/action-result";
import { queryKeys } from "@/lib/query/keys";

import { savePostAction, unsavePostAction } from "./actions";

/**
 * Save / unsave with an optimistic update. Every bookmark for the post reads
 * the same cache entry, so saving from the feed shows in the modal and page.
 */
export function useToggleSave(postId: string) {
  const queryClient = useQueryClient();
  const statusKey = queryKeys.saved.status(postId);
  const mutationKey = ["toggle-save", postId];

  return useMutation({
    mutationKey,
    mutationFn: async (save: boolean) =>
      unwrapActionResult(await (save ? savePostAction : unsavePostAction)({ postId })),

    onMutate: async (save) => {
      await queryClient.cancelQueries({ queryKey: statusKey });
      const previous = queryClient.getQueryData<boolean>(statusKey);
      queryClient.setQueryData(statusKey, save);
      return { previous };
    },

    onSuccess: ({ saved }) => {
      // With rapid clicks, only the last toggle's answer is current.
      if (queryClient.isMutating({ mutationKey }) === 1) {
        queryClient.setQueryData(statusKey, saved);
      }
    },

    onError: (error, _save, context) => {
      queryClient.setQueryData(statusKey, context?.previous);
      toast.error(error.message);
    },

    // The Saved grid gains or loses this post.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.saved.list() }),
  });
}
