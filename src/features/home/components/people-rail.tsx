"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { OnlineAvatar } from "@/features/chat/components/online-avatar";
import { useCurrentUser } from "@/features/profiles/hooks";
import { avatarUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { peopleRailQueryOptions } from "../queries";

const itemClass =
  "flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none";

/**
 * Stories-style row at the top of the feed: "Your post", then the people you
 * follow (whoever posted most recently first, with a ring if it was in the
 * last day, and a green dot when they're online), then suggestions (+).
 * Render inside PeopleRailBoundary.
 */
export function PeopleRail() {
  const user = useCurrentUser();
  const { data: people } = useSuspenseQuery(peopleRailQueryOptions(createClient()));

  return (
    <ul className="flex [scrollbar-width:none] gap-3 overflow-x-auto px-4 py-3.5">
      <li>
        <Link href="/create" className={itemClass}>
          <span className="relative rounded-full p-[5px]">
            <UserAvatar
              name={user?.fullName || user?.username || "You"}
              src={avatarUrl(user?.avatarPath)}
              pixelSize={56}
              className="size-14"
            />
            <span className="absolute right-0.5 bottom-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
              <Plus aria-hidden className="size-3.5" strokeWidth={3} />
            </span>
          </span>
          <span className="w-full truncate text-center text-xs">Your post</span>
        </Link>
      </li>
      {people.map((person) => (
        <li key={person.id}>
          <Link
            href={`/${person.username}` as Route}
            aria-label={`${person.username}${person.postedRecently ? ", new post" : ""}${person.following ? "" : ", suggested"}`}
            className={itemClass}
          >
            <span
              className={cn(
                "relative rounded-full p-[3px]",
                person.postedRecently ? "bg-brand" : person.following ? "bg-border" : "",
              )}
            >
              <span className="block rounded-full bg-card p-0.5">
                <OnlineAvatar person={person} size={56} />
              </span>
              {!person.following && (
                <span className="absolute right-0.5 bottom-0.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background ring-2 ring-card">
                  <Plus aria-hidden className="size-3.5" strokeWidth={3} />
                </span>
              )}
            </span>
            <span
              className={cn(
                "w-full truncate text-center text-xs",
                !person.following && "text-muted-foreground",
              )}
            >
              {person.username}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The rail's shape while it streams in: the same row of circles and names. */
export function PeopleRailSkeleton() {
  return (
    <div aria-hidden className="flex gap-3 overflow-hidden px-4 py-3.5">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
          <Skeleton className="size-[4.125rem] rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
