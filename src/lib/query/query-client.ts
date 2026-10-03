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
        // Data prefetched on the server is "fresh" for a minute, so the browser
        // doesn't immediately refetch what it just received in the HTML.
        staleTime: 60 * 1000,
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
