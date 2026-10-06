import { Suspense } from "react";

import { RouteModal } from "@/components/shared/route-modal";
import { PostModalContent } from "@/features/posts/components/post-modal-content";
import { PostViewSkeleton } from "@/features/posts/components/post-view";

/**
 * Intercepting route: opening a post from the feed, Explore or a profile grid
 * shows it as a modal over that page (the grid stays where you scrolled). A
 * refresh or shared link renders the full page in app/(app)/p/[postId].
 */
export default function PostModal() {
  return (
    <RouteModal title="Post" variant="wide">
      <Suspense fallback={<PostViewSkeleton />}>
        <PostModalContent />
      </Suspense>
    </RouteModal>
  );
}
