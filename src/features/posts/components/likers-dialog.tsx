"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { useInView } from "react-intersection-observer";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { FollowButton } from "@/features/follows/components/follow-button";
import { FollowListSkeleton } from "@/features/follows/components/follow-list";
import { PersonRow } from "@/features/follows/components/person-row";
import { useCurrentUser } from "@/features/profiles/hooks";
import { createClient } from "@/lib/supabase/client";

import { likersQueryOptions } from "../queries";

type LikersDialogProps = { postId: string; open: boolean; onOpenChange: (open: boolean) => void };

/** "Likes": who liked the post, with Follow buttons. Same fixed size as the followers modal. */
export function LikersDialog({ postId, open, onOpenChange }: LikersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(36rem,85dvh)] grid-rows-[auto_1fr] gap-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Likes</DialogTitle>
        </DialogHeader>
        <div className="-mx-6 min-h-0 overflow-y-auto px-6">
          {/* Only fetched once the dialog is opened. */}
          {open && (
            <Suspense fallback={<FollowListSkeleton />}>
              <LikersList postId={postId} />
            </Suspense>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LikersList({ postId }: { postId: string }) {
  const user = useCurrentUser();
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useSuspenseInfiniteQuery(
    likersQueryOptions(createClient(), postId),
  );
  const { ref: sentinelRef } = useInView({
    rootMargin: "200px",
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
  });

  const likers = data.pages.flatMap((page) => page.items);
  if (likers.length === 0) {
    return <p className="py-10 text-center text-muted-foreground">No likes yet.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-border/60">
        {likers.map((person) => (
          <li key={person.id}>
            <PersonRow
              person={person}
              action={
                user?.id === person.id ? null : (
                  <FollowButton
                    profileId={person.id}
                    username={person.username}
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
