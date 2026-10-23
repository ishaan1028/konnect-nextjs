"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Suspense } from "react";

import { LoadErrorBoundary } from "@/components/shared/load-error-boundary";
import { CommentForm } from "@/features/comments/components/comment-form";
import {
  CommentThread,
  CommentThreadSkeleton,
} from "@/features/comments/components/comment-thread";
import { createClient } from "@/lib/supabase/client";

import { postQueryOptions } from "../queries";
import { PostActions, PostActionsSkeleton } from "./post-actions";
import { PostOwnerMenu } from "./post-owner-menu";
import { PostView } from "./post-view";

/**
 * The post inside its modal, fetched in the browser: a modal only opens on a
 * client-side navigation, where the cache already lives, so reopening a post
 * is instant (and refreshes in the background). Render inside <Suspense>.
 */
export function PostModalContent() {
  const { postId } = useParams<{ postId: string }>();
  const { data: post } = useSuspenseQuery(postQueryOptions(createClient(), postId));

  if (!post) {
    return (
      <p className="rounded-4xl bg-card p-10 text-center text-muted-foreground">
        This post isn&apos;t available anymore.
      </p>
    );
  }

  return (
    <PostView
      post={post}
      ownerMenu={
        <PostOwnerMenu
          postId={post.id}
          authorId={post.author.id}
          details={{ caption: post.caption, altText: post.altText, location: post.location }}
        />
      }
      actions={
        <Suspense fallback={<PostActionsSkeleton />}>
          <PostActions
            postId={post.id}
            authorUsername={post.author.username}
            // Its own id: the feed card behind the modal has a comment box too.
            commentInputId={`modal-comment-input-${post.id}`}
          />
        </Suspense>
      }
      commentForm={<CommentForm postId={post.id} inputId={`modal-comment-input-${post.id}`} />}
      comments={
        <LoadErrorBoundary what="comments">
          <Suspense fallback={<CommentThreadSkeleton />}>
            <CommentThread postId={post.id} />
          </Suspense>
        </LoadErrorBoundary>
      }
    />
  );
}
