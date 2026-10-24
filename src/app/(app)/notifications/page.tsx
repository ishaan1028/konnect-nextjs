import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadErrorBoundary } from "@/components/shared/load-error-boundary";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationsBoundary } from "@/features/notifications/components/notifications-boundary";
import { NotificationsSkeleton } from "@/features/notifications/components/notifications-list";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Notifications" description="Likes, comments and new followers." />
      <LoadErrorBoundary what="your notifications">
        <Suspense fallback={<NotificationsSkeleton />}>
          <NotificationsBoundary />
        </Suspense>
      </LoadErrorBoundary>
    </div>
  );
}
