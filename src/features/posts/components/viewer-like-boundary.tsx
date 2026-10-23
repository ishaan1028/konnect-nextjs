import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { currentUserQueryOptions } from "@/features/profiles/queries";
import { getServerQueryClient } from "@/lib/query/server";
import { createClient } from "@/lib/supabase/server";

import { savedStatusQueryOptions } from "@/features/saved/queries";

import { likeStatusQueryOptions } from "../queries";

/**
 * Like CurrentUserBoundary, plus the viewer's like and saved state for one
 * post, so the heart and bookmark are right on first paint. Not awaited: a return visit shows the cached
 * state at once. Render inside <Suspense fallback={<PostActionsSkeleton />}>.
 */
export async function ViewerLikeBoundary({
  postId,
  children,
}: {
  postId: string;
  children: ReactNode;
}) {
  const queryClient = getServerQueryClient();
  const supabase = await createClient();
  void queryClient.prefetchQuery(currentUserQueryOptions(supabase));
  void queryClient.prefetchQuery(likeStatusQueryOptions(supabase, postId));
  void queryClient.prefetchQuery(savedStatusQueryOptions(supabase, postId));

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
