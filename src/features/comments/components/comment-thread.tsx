"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { LoadMoreError } from "@/components/shared/load-more-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

import { useDeleteComment } from "../hooks";
import { commentsQueryOptions } from "../queries";
import { CommentItem } from "./comment-item";

/**
 * A post's comments, newest first, with "View older comments". Read inside a
 * boundary that prefetched them (ViewerCommentsBoundary) or in the modal.
 */
export function CommentThread({ postId }: { postId: string }) {
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } =
    useSuspenseInfiniteQuery(commentsQueryOptions(createClient(), postId));
  const remove = useDeleteComment(postId);
  const listRef = useRef<HTMLHeadingElement>(null);
  const [announcement, setAnnouncement] = useState("");

  const comments = data.pages.flatMap((page) => page.items);

  const onDelete = (commentId: string) => {
    remove.mutate(commentId, { onSuccess: () => setAnnouncement("Comment deleted.") });
    // The deleted comment's button is gone: keep focus inside the thread.
    listRef.current?.focus();
  };

  return (
    <section aria-labelledby={`comments-${postId}`} className="space-y-1">
      <h2 id={`comments-${postId}`} ref={listRef} tabIndex={-1} className="sr-only">
        Comments
      </h2>
      {comments.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No comments yet. Start the conversation.
        </p>
      ) : (
        <ul>
          {comments.map((comment) => (
            <li key={comment.id}>
              <CommentItem comment={comment} onDelete={onDelete} />
            </li>
          ))}
        </ul>
      )}
      {isFetchNextPageError ? (
        <LoadMoreError
          message="Couldn't load older comments."
          onRetry={() => void fetchNextPage()}
        />
      ) : (
        hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage && <Spinner aria-hidden data-icon="inline-start" />}
            View older comments
          </Button>
        )
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

/** Two placeholder comments while the thread loads. */
export function CommentThreadSkeleton() {
  return (
    <div aria-hidden className="space-y-3 py-2">
      {[0, 1].map((row) => (
        <div key={row} className="flex gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
