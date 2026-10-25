import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadErrorBoundary } from "@/components/shared/load-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatBoundary } from "@/features/chat/components/chat-boundaries";
import { SuggestionsBoundary } from "@/features/follows/components/suggestions-boundary";
import { SuggestionsSkeleton } from "@/features/follows/components/suggestions-skeleton";
import { ComposerBar } from "@/features/home/components/composer-bar";
import {
  PopularPosts,
  PopularPostsSkeleton,
  ProfileSummary,
  ProfileSummarySkeleton,
} from "@/features/home/components/home-cards";
import { PeopleRailSkeleton } from "@/features/home/components/people-rail";
import { PeopleRailBoundary } from "@/features/home/components/people-rail-boundary";
import { RailCard } from "@/features/home/components/rail-card";
import { RecentChats } from "@/features/home/components/recent-chats";
import { FeedBoundary } from "@/features/posts/components/feed-boundary";
import { FeedSkeleton } from "@/features/posts/components/feed-skeleton";

export const metadata: Metadata = {
  title: "Home",
};

/**
 * The feed with the people rail and a composer above it; from lg, a side
 * rail with you, suggestions, popular posts and recent chats. The layout is
 * in the static shell; every personal part streams into a slot of its exact
 * final size, so nothing shifts.
 */
export default function HomePage() {
  return (
    <div className="mx-auto grid max-w-xl gap-6 lg:max-w-[61rem] lg:grid-cols-[minmax(0,36rem)_minmax(0,21rem)] lg:justify-center lg:gap-x-8 xl:max-w-[68.5rem] xl:grid-cols-[minmax(0,42rem)_minmax(0,24rem)] xl:gap-x-10">
      <h1 className="sr-only">Home feed</h1>

      <div className="min-w-0 space-y-4">
        <nav aria-label="People" className="rounded-3xl border bg-card">
          <LoadErrorBoundary what="people">
            <Suspense fallback={<PeopleRailSkeleton />}>
              <PeopleRailBoundary />
            </Suspense>
          </LoadErrorBoundary>
        </nav>

        <ComposerBar />

        <section aria-label="Feed">
          <LoadErrorBoundary what="your feed">
            <Suspense fallback={<FeedSkeleton />}>
              <FeedBoundary />
            </Suspense>
          </LoadErrorBoundary>
        </section>
      </div>

      <div className="hidden min-w-0 space-y-4 lg:block">
        <Suspense fallback={<ProfileSummarySkeleton />}>
          <ProfileSummary />
        </Suspense>

        <aside aria-labelledby="suggestions-heading" className="rounded-3xl border bg-card p-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 id="suggestions-heading" className="text-sm font-semibold">
              Suggested for you
            </h2>
          </div>
          {/* Fixed height (fits the 2 suggestions): the skeleton and the list
              fill the same box, so nothing shifts when they load. The side
              padding keeps focus rings from being clipped by the scroll area. */}
          <div className="-mx-1.5 h-30 overflow-y-auto px-1.5">
            <LoadErrorBoundary what="suggestions">
              <Suspense fallback={<SuggestionsSkeleton />}>
                <SuggestionsBoundary />
              </Suspense>
            </LoadErrorBoundary>
          </div>
        </aside>

        <RailCard
          title="Popular on Konnect"
          id="popular-heading"
          action={{ href: "/explore", label: "Explore" }}
        >
          <LoadErrorBoundary what="popular posts">
            <Suspense fallback={<PopularPostsSkeleton />}>
              <PopularPosts />
            </Suspense>
          </LoadErrorBoundary>
        </RailCard>

        <RailCard
          title="Recent chats"
          id="chats-heading"
          action={{ href: "/messages", label: "See all" }}
        >
          {/* Four rows tall, loaded or not. */}
          <div className="h-70">
            <LoadErrorBoundary what="your chats">
              <Suspense fallback={<RecentChatsSkeleton />}>
                <ChatBoundary>
                  <RecentChats />
                </ChatBoundary>
              </Suspense>
            </LoadErrorBoundary>
          </div>
        </RailCard>

        <p className="px-4 text-xs text-muted-foreground">© 2026 Konnect</p>
      </div>
    </div>
  );
}

function RecentChatsSkeleton() {
  return (
    <div aria-hidden className="space-y-0.5">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-3 p-2.5">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      ))}
    </div>
  );
}
