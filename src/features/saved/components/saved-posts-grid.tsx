"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Bookmark, Compass } from "lucide-react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";

import { LoadMoreError } from "@/components/shared/load-more-error";
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
import { PostGridTile } from "@/features/posts/components/post-grid-tile";
import { createClient } from "@/lib/supabase/client";

import { savedPostsQueryOptions } from "../queries";

/**
 * Your saved posts as a 3-column grid, newest saved first. The first page is
 * prefetched on the server (SavedPostsBoundary); more load as you scroll.
 */
export function SavedPostsGrid() {
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } =
    useSuspenseInfiniteQuery(savedPostsQueryOptions(createClient()));
  const { ref: sentinelRef } = useInView({
    rootMargin: "400px",
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
  });

  const posts = data.pages.flatMap((page) => page.items);
  if (posts.length === 0) return <NothingSaved />;

  return (
    <div>
      <ul className="grid grid-cols-3 gap-1 sm:gap-1.5">
        {posts.map((post, index) => (
          <li key={post.id}>
            <PostGridTile post={post} authorUsername={post.authorUsername} priority={index < 3} />
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} aria-hidden />
      {isFetchNextPageError && <LoadMoreError onRetry={() => void fetchNextPage()} />}
      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <Spinner aria-label="Loading more saved posts" />
        </div>
      )}
    </div>
  );
}

function NothingSaved() {
  return (
    <Empty className="min-h-72">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Bookmark aria-hidden />
        </EmptyMedia>
        <EmptyTitle>Nothing saved yet</EmptyTitle>
        <EmptyDescription>
          Tap the bookmark on any post and it will show up here. Only you can see what you save.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href="/explore" className={buttonVariants()}>
          <Compass aria-hidden data-icon="inline-start" />
          Explore posts
        </Link>
      </EmptyContent>
    </Empty>
  );
}
