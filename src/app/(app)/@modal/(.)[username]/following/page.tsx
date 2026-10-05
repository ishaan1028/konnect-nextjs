import { Suspense } from "react";

import { RouteModal } from "@/components/shared/route-modal";
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
      <Suspense fallback={<FollowListSkeleton />}>
        <FollowListModalContent kind="following" />
      </Suspense>
    </RouteModal>
  );
}
