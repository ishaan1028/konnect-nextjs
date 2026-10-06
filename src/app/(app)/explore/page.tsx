import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ExploreBoundary } from "@/features/posts/components/explore-boundary";
import { ProfilePostsSkeleton } from "@/features/posts/components/profile-posts-skeleton";
import { PROFILE_POSTS_PAGE_SIZE } from "@/features/posts/queries";
import { ExploreSearch } from "@/features/search/components/explore-search";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Explore" description="Find people and see what everyone is sharing." />
      {/* The search box reads ?q= from the URL, so it renders per request;
          the grid it shows (when not searching) is prefetched on the server. */}
      <Suspense fallback={<ExploreSkeleton />}>
        <ExploreSearch>
          <Suspense fallback={<ProfilePostsSkeleton count={PROFILE_POSTS_PAGE_SIZE} />}>
            <ExploreBoundary />
          </Suspense>
        </ExploreSearch>
      </Suspense>
    </div>
  );
}

/** The search box and a page of tiles, in exactly their final sizes. */
function ExploreSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <Skeleton className="h-11 rounded-4xl" />
      <ProfilePostsSkeleton count={PROFILE_POSTS_PAGE_SIZE} />
    </div>
  );
}
