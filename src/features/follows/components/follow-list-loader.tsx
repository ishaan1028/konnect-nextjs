import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";

import { currentUserQueryOptions } from "@/features/profiles/queries";
import { getPublicProfile } from "@/features/profiles/server/get-public-profile";
import { getServerQueryClient } from "@/lib/query/server";
import { createClient } from "@/lib/supabase/server";

import { type FollowListKind, followListQueryOptions } from "../queries";
import { FollowList } from "./follow-list";

type FollowListLoaderProps = {
  params: Promise<{ username: string }>;
  kind: FollowListKind;
};

/**
 * For the full page, which can be a first visit: resolves the profile,
 * prefetches the first page of the list (plus the viewer, for the buttons) and
 * hydrates the client list. The modal reads the browser cache instead
 * (FollowListModalContent). Render inside <Suspense>.
 */
export async function FollowListLoader({ params, kind }: FollowListLoaderProps) {
  const username = decodeURIComponent((await params).username).toLowerCase();
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const queryClient = getServerQueryClient();
  const supabase = await createClient();
  // Not awaited: cached lists show at once and refresh in the background.
  void queryClient.prefetchQuery(currentUserQueryOptions(supabase));
  void queryClient.prefetchInfiniteQuery(followListQueryOptions(supabase, profile.id, kind));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FollowList profileId={profile.id} kind={kind} />
    </HydrationBoundary>
  );
}
