import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { currentUserQueryOptions } from "@/features/profiles/queries";
import { getServerQueryClient } from "@/lib/query/server";
import { createClient } from "@/lib/supabase/server";

import { followSuggestionsQueryOptions } from "../queries";
import { SuggestionsList } from "./suggestions";

/**
 * Prefetches suggestions (and the viewer) on the server without awaiting, so
 * a return visit shows the cached list at once and refreshes it in the
 * background (see CurrentUserBoundary). Render inside <Suspense>.
 */
export async function SuggestionsBoundary() {
  const queryClient = getServerQueryClient();
  const supabase = await createClient();
  void queryClient.prefetchQuery(currentUserQueryOptions(supabase));
  void queryClient.prefetchQuery(followSuggestionsQueryOptions(supabase));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SuggestionsList />
    </HydrationBoundary>
  );
}
