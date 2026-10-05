import {
  defaultShouldDehydrateQuery,
  QueryClient,
  type QueryClientConfig,
} from "@tanstack/react-query";

/**
 * Shared QueryClient defaults for the server (prefetching) and the browser.
 * Kept free of browser-only imports so Server Components can use it too.
 */
export function makeQueryClient(config: Pick<QueryClientConfig, "mutationCache"> = {}) {
  return new QueryClient({
    ...config,
    defaultOptions: {
      queries: {
        // Stale-while-revalidate by default: cached data always renders at
        // once, and any later mount, focus or reconnect refetches it in the
        // background. The few seconds of freshness only stop the browser from
        // refetching what it just received from the server (TanStack's SSR
        // advice); "0" would fetch everything twice on a page load. Queries
        // that rarely change set a longer staleTime of their own.
        staleTime: 5 * 1000,
      },
      dehydrate: {
        // Also send queries that are still loading, so a prefetch that hasn't
        // resolved yet can stream to the client instead of being dropped.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
        // Next.js signals dynamic rendering by throwing special errors; they
        // must pass through untouched rather than being redacted.
        shouldRedactErrors: () => false,
      },
    },
  });
}
