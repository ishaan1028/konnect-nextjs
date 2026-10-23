import { Suspense } from "react";

import { RouteModal } from "@/components/shared/route-modal";
import { LoadErrorBoundary } from "@/components/shared/load-error-boundary";
import { FollowListSkeleton } from "@/features/follows/components/follow-list";
import { FollowListModalContent } from "@/features/follows/components/follow-list-modal-content";

/**
 * Intercepting route: "(.)" catches a client-side navigation to
 * /[username]/following from a page in this layout and shows it as a modal over
 * the current page. A refresh or shared link renders the full page in
 * app/(app)/[username]/following instead.
 */
export default function FollowingModal() {
  return (
    <RouteModal title="Following">
      <LoadErrorBoundary what="who they follow">
        <Suspense fallback={<FollowListSkeleton />}>
          <FollowListModalContent kind="following" />
        </Suspense>
      </LoadErrorBoundary>
    </RouteModal>
  );
}
