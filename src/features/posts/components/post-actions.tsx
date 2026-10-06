"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Heart, MessageCircle } from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/profiles/hooks";
import { pluralize } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { useToggleLike } from "../hooks";
import { type LikeStatus, likeStatusQueryOptions } from "../queries";
import { SharePostButton } from "./share-post-button";

// Loaded the first time someone opens "Likes", not with every post.
const LikersDialog = dynamic(() => import("./likers-dialog").then((m) => m.LikersDialog));

type PostActionsProps = {
  postId: string;
  authorUsername: string;
  /** Known like state (a feed card's row); without it, it's read or fetched. */
  initial?: LikeStatus;
  /** Where the comment button goes (the post itself); omitted on the post page. */
  commentHref?: Route;
};

/**
 * Like, comment and share, then the like count (which opens "Likes").
 * Reads the post's shared like state, so every view of the post agrees.
 * Render inside a CurrentUserBoundary (or where the current user is cached).
 */
export function PostActions({ postId, authorUsername, initial, commentHref }: PostActionsProps) {
  const user = useCurrentUser();
  const { data: likes } = useSuspenseQuery({
    ...likeStatusQueryOptions(createClient(), postId),
    ...(initial ? { initialData: initial } : {}),
  });
  const toggle = useToggleLike(postId);
  const [likersOpen, setLikersOpen] = useState(false);
  const [likersOpened, setLikersOpened] = useState(false);

  const heart = (
    <Heart
      aria-hidden
      // A new key when it becomes liked replays the little "pop".
      key={String(likes.liked)}
      className={cn("size-6", likes.liked && "animate-like-pop fill-red-500 text-red-500")}
    />
  );

  return (
    <div className="space-y-1">
      <div className="-ml-2 flex items-center">
        {user ? (
          // A toggle: the name stays "Like", aria-pressed says whether it's on.
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Like"
            aria-pressed={likes.liked}
            onClick={() => toggle.mutate(!likes.liked)}
          >
            {heart}
          </Button>
        ) : (
          <Link
            href={`/login?${new URLSearchParams({ next: `/p/${postId}` })}` as Route}
            aria-label="Log in to like"
            className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
          >
            {heart}
          </Link>
        )}
        {commentHref && (
          <Link
            href={commentHref}
            aria-label="Comment"
            className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
          >
            <MessageCircle aria-hidden className="size-6" />
          </Link>
        )}
        <SharePostButton postId={postId} authorUsername={authorUsername} />
      </div>

      {likes.count > 0 ? (
        <button
          type="button"
          onClick={() => {
            setLikersOpened(true);
            setLikersOpen(true);
          }}
          className="rounded-md text-sm font-semibold hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          {likes.count.toLocaleString("en")} {pluralize(likes.count, "like", "likes")}
        </button>
      ) : (
        <p className="text-sm text-muted-foreground">Be the first to like this</p>
      )}
      {likersOpened && (
        <LikersDialog postId={postId} open={likersOpen} onOpenChange={setLikersOpen} />
      )}
    </div>
  );
}

/** The same height as PostActions, for the moment its like state streams in. */
export function PostActionsSkeleton() {
  return (
    <div aria-hidden className="space-y-1">
      <div className="flex h-10 items-center gap-3">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="size-7 rounded-full" />
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}
