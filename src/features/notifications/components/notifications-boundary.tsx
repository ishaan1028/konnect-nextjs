import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { currentUserQueryOptions } from "@/features/profiles/queries";
import { requireUser } from "@/lib/dal";
import { getServerQueryClient } from "@/lib/query/server";
import { createClient } from "@/lib/supabase/server";

import { notificationsQueryOptions } from "../queries";
import { NotificationsList } from "./notifications-list";

/**
 * Starts the first page of notifications (and the viewer, for Follow back
 * buttons) without awaiting, so a return visit shows the cached list at once
 * and refreshes it in the background. Render inside <Suspense>.
 */
export async function NotificationsBoundary() {
  // The proxy only checks for a session cookie; an expired one lands here.
  await requireUser();
  const queryClient = getServerQueryClient();
  const supabase = await createClient();
  void queryClient.prefetchQuery(currentUserQueryOptions(supabase));
  void queryClient.prefetchInfiniteQuery(notificationsQueryOptions(supabase));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotificationsList />
    </HydrationBoundary>
  );
}
