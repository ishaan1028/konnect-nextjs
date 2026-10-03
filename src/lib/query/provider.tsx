"use client";

import {
  isServer,
  MutationCache,
  type QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { lazy, type ReactNode, Suspense } from "react";
import { toast } from "sonner";

import { makeQueryClient } from "./query-client";

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  // During SSR of client components: a fresh client per request.
  if (isServer) return makeQueryClient();

  // In the browser: one client for the whole session, so the cache survives
  // navigations. Mutations without their own onError get a toast.
  browserQueryClient ??= makeQueryClient({
    mutationCache: new MutationCache({
      onError(error, _variables, _context, mutation) {
        if (mutation.options.onError) return;
        toast.error(error instanceof Error ? error.message : "Something went wrong.");
      },
    }),
  });
  return browserQueryClient;
}

// Devtools are loaded only in development and never reach the production bundle.
const ReactQueryDevtools =
  process.env.NODE_ENV === "development"
    ? lazy(() =>
        import("@tanstack/react-query-devtools").then((module) => ({
          default: module.ReactQueryDevtools,
        })),
      )
    : () => null;

export function QueryProvider({ children }: { children: ReactNode }) {
  // Not useState: the client must survive React throwing away this component
  // during a suspended first render (see TanStack's advanced SSR guide).
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Suspense fallback={null}>
        <ReactQueryDevtools buttonPosition="top-right" />
      </Suspense>
    </QueryClientProvider>
  );
}
