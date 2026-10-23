import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { requireUser } from "@/lib/dal";
import { getServerQueryClient } from "@/lib/query/server";
import { createClient } from "@/lib/supabase/server";

import { savedPostsQueryOptions } from "../queries";
import { SavedPostsGrid } from "./saved-posts-grid";

/**
 * Starts loading your first page of saved posts without awaiting, so a return
 * visit shows the cached grid at once and refreshes it in the background.
 * Render inside <Suspense>.
 */
export async function SavedPostsBoundary() {
  // The proxy only checks for a session cookie; an expired one lands here.
  await requireUser();
  const queryClient = getServerQueryClient();
  void queryClient.prefetchInfiniteQuery(savedPostsQueryOptions(await createClient()));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SavedPostsGrid />
    </HydrationBoundary>
  );
}
