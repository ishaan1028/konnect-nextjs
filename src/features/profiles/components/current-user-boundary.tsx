import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getServerQueryClient } from "@/lib/query/server";
import { createClient } from "@/lib/supabase/server";

import { currentUserQueryOptions } from "../queries";

/**
 * Prefetches the signed-in user on the server and hands it to the client cache.
 *
 *   server: start prefetchQuery → dehydrate (the query is still pending: its
 *           promise streams to the browser when it resolves)
 *   client: <HydrationBoundary> writes it into the browser QueryClient.
 *           First visit: useCurrentUser() suspends until the promise resolves.
 *           Later visits: the cached user renders at once, and the server's
 *           result replaces it in the background (stale-while-revalidate).
 *
 * Never await the prefetch: that would hold this boundary on its fallback
 * until the database answers, even when the browser already has the data.
 *
 * It reads cookies, so with Cache Components it must sit inside <Suspense>.
 * Keep those boundaries small (a nav item, a greeting) so the rest of the page
 * stays in the prerendered static shell.
 */
export async function CurrentUserBoundary({ children }: { children: ReactNode }) {
  const queryClient = getServerQueryClient();
  // Several boundaries on one page share this request-scoped client, so the
  // user is fetched once, not once per boundary.
  void queryClient.prefetchQuery(currentUserQueryOptions(await createClient()));

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
