import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { currentUserQueryOptions } from "@/features/profiles/queries";
import { getServerQueryClient } from "@/lib/query/server";
import { createClient } from "@/lib/supabase/server";

import { followStatusQueryOptions } from "../queries";

/**
 * Like CurrentUserBoundary, plus the viewer's follow status for one profile,
 * so the Follow button renders its real state ("Following") on the first
 * paint instead of flickering from "Follow". Not awaited, so a return visit
 * shows the cached state at once. Render inside <Suspense>.
 */
export async function ViewerFollowBoundary({
  profileId,
  children,
}: {
  profileId: string;
  children: ReactNode;
}) {
  const queryClient = getServerQueryClient();
  const supabase = await createClient();
  void queryClient.prefetchQuery(currentUserQueryOptions(supabase));
  void queryClient.prefetchQuery(followStatusQueryOptions(supabase, profileId));

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
