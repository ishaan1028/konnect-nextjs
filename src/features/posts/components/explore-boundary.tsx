import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { requireUser } from "@/lib/dal";
import { getServerQueryClient } from "@/lib/query/server";
import { createClient } from "@/lib/supabase/server";

import { exploreQueryOptions } from "../queries";
import { ExploreGrid } from "./explore-grid";

/**
 * Starts the first page of Explore without awaiting (it leaves out your own
 * posts, so it needs the session). Render inside <Suspense>.
 */
export async function ExploreBoundary() {
  // The proxy only checks for a session cookie; an expired one lands here.
  await requireUser();
  const queryClient = getServerQueryClient();
  void queryClient.prefetchInfiniteQuery(exploreQueryOptions(await createClient()));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ExploreGrid />
    </HydrationBoundary>
  );
}
