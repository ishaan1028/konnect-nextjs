"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useEffectEvent } from "react";
import { useInView } from "react-intersection-observer";

import { LoadMoreError } from "@/components/shared/load-more-error";
import { RelativeTime } from "@/components/shared/relative-time";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { FollowButton } from "@/features/follows/components/follow-button";
import { useCurrentUser } from "@/features/profiles/hooks";
import { dayKey, dayLabel } from "@/lib/format";
import { avatarUrl, postImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { thumbhashPlaceholder } from "@/lib/thumbhash";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

import { useMarkNotificationsRead } from "../hooks";
import { groupNotifications, type NotificationGroup } from "../group";
import { notificationsQueryOptions } from "../queries";

/**
 * Your notifications, newest first, under day headings, with likes on a post
 * and new followers grouped ("maya.k and 3 others"). Opening the page (and
 * anything arriving while you're on it) marks them read; what was unread
 * stays highlighted for this visit. Render inside NotificationsBoundary.
 */
export function NotificationsList() {
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } =
    useSuspenseInfiniteQuery(notificationsQueryOptions(createClient()));
  const markRead = useMarkNotificationsRead();
  const now = useNow();
  const { ref: sentinelRef } = useInView({
    rootMargin: "400px",
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
  });

  const notifications = data.pages.flatMap((page) => page.items);
  const newestId = notifications[0]?.id;
  const readIfVisible = useEffectEvent(() => {
    if (document.visibilityState === "visible") void markRead();
  });
  useEffect(() => {
    if (newestId) readIfVisible();
  }, [newestId]);

  if (notifications.length === 0) return <NoNotifications />;
  const groups = groupNotifications(notifications);

  return (
    <div>
      <ul className="flex flex-col">
        {groups.map((group, index) => {
          const { createdAt } = group.latest;
          const previous = groups[index - 1]?.latest.createdAt;
          // Day headings use the viewer's time zone, so they're added after
          // hydration (now !== null) to keep the server HTML identical.
          const newDay = now !== null && (!previous || dayKey(previous) !== dayKey(createdAt));
          return (
            <li key={group.latest.id}>
              {newDay && (
                <h2 className="px-3 pt-5 pb-2 text-sm font-semibold">{dayLabel(createdAt, now)}</h2>
              )}
              <NotificationRow group={group} />
            </li>
          );
        })}
      </ul>
      <div ref={sentinelRef} aria-hidden />
      {isFetchNextPageError && <LoadMoreError onRetry={() => void fetchNextPage()} />}
      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <Spinner aria-label="Loading more notifications" />
        </div>
      )}
    </div>
  );
}

function NotificationRow({ group }: { group: NotificationGroup }) {
  const user = useCurrentUser();
  const { latest, actors } = group;
  const [first, second] = actors;
  const others = actors.length - 2;
  // One link per row: to the post, to whoever followed, or (several) to your followers.
  const href = (
    latest.post
      ? `/p/${latest.post.id}`
      : actors.length > 1 && user
        ? `/${user.username}/followers`
        : `/${first!.username}`
  ) as Route;
  const action =
    latest.type === "like"
      ? "liked your post."
      : latest.type === "comment"
        ? `commented: “${latest.commentBody ?? ""}”`
        : "started following you.";

  return (
    <div className={cn("flex items-center gap-3 rounded-2xl p-3", !group.read && "bg-primary/5")}>
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        {second ? (
          // Two of them, overlapping, in the space of one avatar.
          <span className="relative size-11 shrink-0">
            <UserAvatar
              name={second.fullName || second.username}
              src={avatarUrl(second.avatarPath)}
              pixelSize={32}
              className="absolute top-0 right-0 size-8"
            />
            <UserAvatar
              name={first!.fullName || first!.username}
              src={avatarUrl(first!.avatarPath)}
              pixelSize={32}
              className="absolute bottom-0 left-0 size-8 ring-2 ring-background"
            />
          </span>
        ) : (
          <UserAvatar
            name={first!.fullName || first!.username}
            src={avatarUrl(first!.avatarPath)}
            pixelSize={44}
            className="size-11"
          />
        )}
        <p className="min-w-0 flex-1 text-sm">
          {!group.read && <span className="sr-only">New: </span>}
          <span className="font-semibold">{first!.username}</span>
          {actors.length === 2 && (
            <>
              {" and "}
              <span className="font-semibold">{second!.username}</span>
            </>
          )}
          {others > 0 && (
            <>
              {", "}
              <span className="font-semibold">{second!.username}</span>
              {` and ${others} ${others === 1 ? "other" : "others"}`}
            </>
          )}{" "}
          <span className="break-words">{action}</span>{" "}
          <RelativeTime date={latest.createdAt} className="text-muted-foreground" />
        </p>
        {latest.post && (
          <Image
            src={postImageUrl(latest.post.imagePath)}
            alt=""
            width={44}
            height={44}
            sizes="44px"
            placeholder={thumbhashPlaceholder(latest.post.thumbhash)}
            className="size-11 shrink-0 rounded-lg bg-muted object-cover"
          />
        )}
      </Link>
      {latest.type === "follow" && actors.length === 1 && (
        <FollowButton
          profileId={first!.id}
          username={first!.username}
          initialStatus={{
            isFollowing: latest.viewerFollowsActor,
            isFollowedBy: latest.actorFollowsViewer,
          }}
        />
      )}
    </div>
  );
}

function NoNotifications() {
  return (
    <Empty className="min-h-72">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Heart aria-hidden />
        </EmptyMedia>
        <EmptyTitle>No notifications yet</EmptyTitle>
        <EmptyDescription>
          When someone likes or comments on your posts, or follows you, you&apos;ll see it here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** A few rows in the shape of real ones, while the first page streams in. */
export function NotificationsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="flex items-center gap-3 p-3">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="size-11 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
