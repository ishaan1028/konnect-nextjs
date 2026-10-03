"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

import { currentUserQueryOptions } from "./queries";

/**
 * The signed-in user (or null), for components rendered inside a
 * <CurrentUserBoundary>. The server already prefetched it, so this reads the
 * hydrated cache instantly: no loading state, no extra request.
 *
 * Only call it *inside* a boundary. Reading this query anywhere that renders
 * before its <HydrationBoundary> during SSR creates an empty cache entry, the
 * boundary then defers hydration to an effect (which never runs on the
 * server), and the server and client render different users.
 */
export function useCurrentUser() {
  return useSuspenseQuery(currentUserQueryOptions(createClient())).data;
}
