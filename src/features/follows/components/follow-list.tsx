"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { UsersRound } from "lucide-react";
import { useInView } from "react-intersection-observer";

import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/features/profiles/hooks";
import { createClient } from "@/lib/supabase/client";

import { type FollowListKind, followListQueryOptions } from "../queries";
import { FollowButton } from "./follow-button";
import { PersonRow } from "./person-row";
import { RemoveFollowerButton } from "./remove-follower-button";

type FollowListProps = {
  profileId: string;
  kind: FollowListKind;
};

const EMPTY_TEXT: Record<FollowListKind, string> = {
  followers: "No followers yet.",
  following: "Not following anyone yet.",
};

/**
 * A profile's followers or following, with infinite scroll.
 * The first page is prefetched on the server (see FollowListLoader); more
 * pages load when the sentinel at the bottom scrolls into view.
 */
export function FollowList({ profileId, kind }: FollowListProps) {
  const user = useCurrentUser();
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useSuspenseInfiniteQuery(
    followListQueryOptions(createClient(), profileId, kind),
  );
  const { ref: sentinelRef } = useInView({
    // Start loading a little before the user reaches the end.
    rootMargin: "200px",
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
  });

  const items = data.pages.flatMap((page) => page.items);
  const isOwnFollowers = kind === "followers" && user?.id === profileId;

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
        <UsersRound aria-hidden className="size-8" />
        <p>{EMPTY_TEXT[kind]}</p>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-border/60">
        {items.map((person) => (
          <li key={person.id}>
            <PersonRow
              person={person}
              action={
                user?.id === person.id ? null : isOwnFollowers ? (
                  <RemoveFollowerButton profileId={profileId} follower={person} />
                ) : (
                  <FollowButton
                    profileId={person.id}
                    username={person.username}
                    // The list already knows both directions: no request per row.
                    initialStatus={{
                      isFollowing: person.viewerFollows,
                      isFollowedBy: person.followsViewer,
                    }}
                  />
                )
              }
            />
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} aria-hidden />
      {isFetchingNextPage && (
        <div className="flex justify-center py-3">
          <Spinner aria-label="Loading more" />
        </div>
      )}
    </div>
  );
}

export function FollowListSkeleton() {
  return (
    <ul aria-hidden className="space-y-1">
      {[0, 1, 2, 3, 4].map((row) => (
        <li key={row} className="flex items-center gap-3 py-2">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
