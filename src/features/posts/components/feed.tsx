"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Compass, Images } from "lucide-react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";

import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

import { feedQueryOptions } from "../queries";
import { PostCard } from "./post-card";

/**
 * The home feed: your posts and the posts of people you follow, newest first,
 * loading the next page shortly before you reach the end. The first page is
 * prefetched on the server (FeedBoundary); render inside it.
 */
export function Feed() {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useSuspenseInfiniteQuery(
    feedQueryOptions(createClient()),
  );
  const { ref: sentinelRef } = useInView({
    // Start loading about a screen early, so scrolling never hits the end.
    rootMargin: "100% 0px",
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
  });

  const posts = data.pages.flatMap((page) => page.items);
  if (posts.length === 0) return <EmptyFeed />;

  return (
    <div className="space-y-6">
      {posts.map((post, index) => (
        <PostCard key={post.id} post={post} priority={index === 0} />
      ))}
      <div ref={sentinelRef} aria-hidden />
      {isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <Spinner aria-label="Loading more posts" />
        </div>
      ) : (
        !hasNextPage && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        )
      )}
    </div>
  );
}

function EmptyFeed() {
  return (
    <Empty className="rounded-4xl border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Images aria-hidden />
        </EmptyMedia>
        <EmptyTitle>Your feed is waiting</EmptyTitle>
        <EmptyDescription>
          Follow people from the suggestions, or explore what everyone is sharing.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href="/explore" className={buttonVariants()}>
          <Compass aria-hidden data-icon="inline-start" />
          Explore
        </Link>
      </EmptyContent>
    </Empty>
  );
}
