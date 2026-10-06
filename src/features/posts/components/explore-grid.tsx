"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Compass } from "lucide-react";
import { useInView } from "react-intersection-observer";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

import { exploreQueryOptions } from "../queries";
import { PostGridTile } from "./post-grid-tile";

/** Everyone else's posts as a 3-column grid. Render inside ExploreBoundary. */
export function ExploreGrid() {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useSuspenseInfiniteQuery(
    exploreQueryOptions(createClient()),
  );
  const { ref: sentinelRef } = useInView({
    rootMargin: "100% 0px",
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
  });

  const posts = data.pages.flatMap((page) => page.items);
  if (posts.length === 0) {
    return (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Compass aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Nothing to explore yet</EmptyTitle>
          <EmptyDescription>Posts from people on Konnect will appear here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div>
      <ul className="grid grid-cols-3 gap-1 sm:gap-1.5">
        {posts.map((post, index) => (
          <li key={post.id}>
            <PostGridTile
              priority={index < 3}
              post={post}
              authorUsername={post.authorUsername}
              counts={{ likes: post.likesCount, comments: post.commentsCount }}
            />
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} aria-hidden />
      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <Spinner aria-label="Loading more posts" />
        </div>
      )}
    </div>
  );
}
