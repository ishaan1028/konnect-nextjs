import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { currentUserQueryOptions } from "@/features/profiles/queries";
import { getServerQueryClient } from "@/lib/query/server";
import { createClient } from "@/lib/supabase/server";

import { feedQueryOptions } from "../queries";
import { Feed } from "./feed";

/**
 * Starts the first page of the feed (and the viewer, for the Like buttons)
 * without awaiting: a return visit shows the cached feed at once and
 * refreshes it in the background. Render inside <Suspense>.
 */
export async function FeedBoundary() {
  const queryClient = getServerQueryClient();
  const supabase = await createClient();
  void queryClient.prefetchQuery(currentUserQueryOptions(supabase));
  void queryClient.prefetchInfiniteQuery(feedQueryOptions(supabase));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Feed />
    </HydrationBoundary>
  );
}
