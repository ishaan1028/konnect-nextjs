"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Camera, ImagePlus } from "lucide-react";
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
import { useCurrentUser } from "@/features/profiles/hooks";
import { createClient } from "@/lib/supabase/client";

import { profilePostsQueryOptions } from "../queries";
import { PostGridTile } from "./post-grid-tile";

type ProfilePostsGridProps = { profileId: string; username: string };

/**
 * A profile's posts as a 3-column grid of square tiles, newest first.
 * The first page is prefetched on the server (ProfilePostsBoundary); more load
 * as the sentinel at the bottom scrolls into view. Render inside that boundary.
 */
export function ProfilePostsGrid({ profileId, username }: ProfilePostsGridProps) {
  const user = useCurrentUser();
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useSuspenseInfiniteQuery(
    profilePostsQueryOptions(createClient(), profileId),
  );
  const { ref: sentinelRef } = useInView({
    rootMargin: "400px",
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
  });

  const posts = data.pages.flatMap((page) => page.items);
  if (posts.length === 0) return <NoPosts isOwnProfile={user?.id === profileId} />;

  return (
    <div>
      <ul className="grid grid-cols-3 gap-1 sm:gap-1.5">
        {posts.map((post, index) => (
          <li key={post.id}>
            <PostGridTile post={post} authorUsername={username} priority={index < 3} />
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

function NoPosts({ isOwnProfile }: { isOwnProfile: boolean }) {
  return (
    <Empty className="min-h-72">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Camera aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{isOwnProfile ? "Share your first photo" : "No posts yet"}</EmptyTitle>
        <EmptyDescription>
          {isOwnProfile
            ? "Your photos will appear on your profile."
            : "Photos shared by this account will appear here."}
        </EmptyDescription>
      </EmptyHeader>
      {isOwnProfile && (
        <EmptyContent>
          <Link href="/create" className={buttonVariants()}>
            <ImagePlus aria-hidden data-icon="inline-start" />
            New post
          </Link>
        </EmptyContent>
      )}
    </Empty>
  );
}
