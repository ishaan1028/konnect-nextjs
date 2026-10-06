import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { currentUserQueryOptions } from "@/features/profiles/queries";
import { getServerQueryClient } from "@/lib/query/server";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

import { profilePostsQueryOptions } from "../queries";
import { ProfilePostsGrid } from "./profile-posts-grid";

/**
 * Starts loading a profile's first page of posts (plus the viewer, for the
 * "Share your first photo" prompt) without awaiting, so a return visit shows
 * the cached grid at once and refreshes it in the background. Posts are
 * public, so they're fetched with the cookie-less client. Render inside
 * <Suspense fallback={<ProfilePostsSkeleton …/>}>.
 */
export async function ProfilePostsBoundary({
  profileId,
  username,
}: {
  profileId: string;
  username: string;
}) {
  const queryClient = getServerQueryClient();
  void queryClient.prefetchQuery(currentUserQueryOptions(await createClient()));
  void queryClient.prefetchInfiniteQuery(profilePostsQueryOptions(createPublicClient(), profileId));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfilePostsGrid profileId={profileId} username={username} />
    </HydrationBoundary>
  );
}
