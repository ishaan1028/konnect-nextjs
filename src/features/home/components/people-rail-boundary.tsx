import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { currentUserQueryOptions } from "@/features/profiles/queries";
import { requireUser } from "@/lib/dal";
import { getServerQueryClient } from "@/lib/query/server";
import { createClient } from "@/lib/supabase/server";

import { peopleRailQueryOptions } from "../queries";
import { PeopleRail } from "./people-rail";

/** Prefetches the rail (and the viewer) without awaiting. Render inside <Suspense>. */
export async function PeopleRailBoundary() {
  // The proxy only checks for a session cookie; an expired one lands here.
  await requireUser();
  const queryClient = getServerQueryClient();
  const supabase = await createClient();
  void queryClient.prefetchQuery(currentUserQueryOptions(supabase));
  void queryClient.prefetchQuery(peopleRailQueryOptions(supabase));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PeopleRail />
    </HydrationBoundary>
  );
}
