import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { currentUserQueryOptions } from "@/features/profiles/queries";
import { getServerQueryClient } from "@/lib/query/server";
import { createClient } from "@/lib/supabase/server";

import { inboxQueryOptions, messagesQueryOptions } from "../queries";

/**
 * Starts the inbox (and, for an open chat, its latest messages) plus the
 * viewer, without awaiting (see CurrentUserBoundary). Render inside <Suspense>.
 */
export async function ChatBoundary({
  conversationId,
  children,
}: {
  conversationId?: string;
  children: ReactNode;
}) {
  const queryClient = getServerQueryClient();
  const supabase = await createClient();
  void queryClient.prefetchQuery(currentUserQueryOptions(supabase));
  void queryClient.prefetchQuery(inboxQueryOptions(supabase));
  if (conversationId) {
    void queryClient.prefetchInfiniteQuery(messagesQueryOptions(supabase, conversationId));
  }

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
