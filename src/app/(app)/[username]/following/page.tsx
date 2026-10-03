import { UserRoundCheck } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Following" };

export default function FollowingPage() {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader title="Following" />
      <ComingSoon
        icon={UserRoundCheck}
        title="Following list"
        description="Opens as a modal over the profile, or as this full page when shared or refreshed."
        phase={7}
      />
    </div>
  );
}
