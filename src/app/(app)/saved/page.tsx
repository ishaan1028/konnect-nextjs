import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadErrorBoundary } from "@/components/shared/load-error-boundary";
import { PageHeader } from "@/components/shared/page-header";
import { ProfilePostsSkeleton } from "@/features/posts/components/profile-posts-skeleton";
import { SavedPostsBoundary } from "@/features/saved/components/saved-posts-boundary";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Saved" description="Only you can see what you've saved." />
      <LoadErrorBoundary what="your saved posts">
        {/* shortcut: one row of placeholders (the count isn't known before it loads); a longer list grows below it. */}
        <Suspense fallback={<ProfilePostsSkeleton count={3} />}>
          <SavedPostsBoundary />
        </Suspense>
      </LoadErrorBoundary>
    </div>
  );
}
