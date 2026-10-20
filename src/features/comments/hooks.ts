"use client";

import {
  type InfiniteData,
  type QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import type { FeedPage, FeedPost } from "@/features/posts/queries";
import type { CurrentUser } from "@/features/profiles/queries";
import { unwrapActionResult } from "@/lib/action-result";
import { queryKeys } from "@/lib/query/keys";

import { addCommentAction, deleteCommentAction } from "./actions";
import type { Comment, CommentsPage } from "./queries";

type Thread = InfiniteData<CommentsPage>;
type Feed = InfiniteData<FeedPage>;

/*
 * A comment shows up in two caches: the post's thread and, if the post is in
 * the feed, its card (count and latest two comments). Both hooks update both,
 * so the card behind an open post modal stays in sync, and roll both back
 * together on failure.
 */

function updateThread(
  client: QueryClient,
  postId: string,
  update: (items: Comment[], pageIndex: number) => Comment[],
) {
  client.setQueryData<Thread>(queryKeys.comments.thread(postId), (thread) =>
    thread
      ? {
          ...thread,
          pages: thread.pages.map((page, index) => ({ ...page, items: update(page.items, index) })),
        }
      : thread,
  );
}

function updateFeedPost(client: QueryClient, postId: string, update: (post: FeedPost) => FeedPost) {
  client.setQueryData<Feed>(queryKeys.posts.feed(), (feed) =>
    feed
      ? {
          ...feed,
          pages: feed.pages.map((page) => ({
            ...page,
            items: page.items.map((post) => (post.id === postId ? update(post) : post)),
          })),
        }
      : feed,
  );
}

function snapshot(client: QueryClient, postId: string) {
  return {
    thread: client.getQueryData<Thread>(queryKeys.comments.thread(postId)),
    feed: client.getQueryData<Feed>(queryKeys.posts.feed()),
  };
}

function restore(client: QueryClient, postId: string, saved?: ReturnType<typeof snapshot>) {
  if (!saved) return;
  client.setQueryData(queryKeys.comments.thread(postId), saved.thread);
  client.setQueryData(queryKeys.posts.feed(), saved.feed);
}

/**
 * Add a comment, optimistically: it appears at once (at the top of the
 * thread, and under the feed card) with a temporary id, then is swapped for
 * the saved one. On failure it disappears again and the error is shown.
 */
export function useAddComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ body }: { body: string; tempId: string }) =>
      unwrapActionResult(await addCommentAction({ postId, body })),

    onMutate: async ({ body, tempId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.comments.thread(postId) });
      const saved = snapshot(queryClient, postId);
      const user = queryClient.getQueryData<CurrentUser | null>(queryKeys.currentUser);
      const createdAt = new Date().toISOString();

      const optimistic: Comment = {
        id: tempId,
        body,
        createdAt,
        canDelete: false,
        pending: true,
        author: {
          id: user?.id ?? "",
          username: user?.username ?? "you",
          fullName: user?.fullName ?? "",
          avatarPath: user?.avatarPath ?? null,
        },
      };
      // Newest first: it belongs at the very top of the first page.
      updateThread(queryClient, postId, (items, page) =>
        page === 0 ? [optimistic, ...items] : items,
      );
      updateFeedPost(queryClient, postId, (post) => ({
        ...post,
        commentsCount: post.commentsCount + 1,
        latestComments: [
          ...post.latestComments,
          { id: tempId, body, createdAt, authorUsername: optimistic.author.username },
        ].slice(-2),
      }));
      return saved;
    },

    onSuccess: (comment, { tempId }) => {
      updateThread(queryClient, postId, (items) =>
        items.map((item) => (item.id === tempId ? comment : item)),
      );
      updateFeedPost(queryClient, postId, (post) => ({
        ...post,
        latestComments: post.latestComments.map((latest) =>
          latest.id === tempId
            ? { ...latest, id: comment.id, createdAt: comment.createdAt }
            : latest,
        ),
      }));
    },

    onError: (error, _variables, saved) => {
      restore(queryClient, postId, saved);
      toast.error(error.message);
    },

    onSettled: () =>
      // Explore tiles show comment counts; mark them stale without refetching.
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.explore(), refetchType: "none" }),
  });
}

/** Delete a comment, optimistically removing it everywhere (rolled back on failure). */
export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) =>
      unwrapActionResult(await deleteCommentAction({ commentId })),

    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.comments.thread(postId) });
      const saved = snapshot(queryClient, postId);
      updateThread(queryClient, postId, (items) => items.filter((item) => item.id !== commentId));
      updateFeedPost(queryClient, postId, (post) => ({
        ...post,
        commentsCount: Math.max(0, post.commentsCount - 1),
        latestComments: post.latestComments.filter((latest) => latest.id !== commentId),
      }));
      return saved;
    },

    onError: (error, _commentId, saved) => {
      restore(queryClient, postId, saved);
      toast.error(error.message);
    },

    onSettled: () => {
      // The card may now show one comment where it had two: let the next feed
      // load backfill it, and mark Explore's counts stale (no refetch now).
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.feed(), refetchType: "none" });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posts.explore(),
        refetchType: "none",
      });
    },
  });
}
