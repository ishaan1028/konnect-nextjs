import { Bookmark } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader title="Saved" description="Only you can see what you've saved." />
      <ComingSoon
        icon={Bookmark}
        title="Save posts for later"
        description="Tap the bookmark on any post and it will show up here."
        phase="bonus"
      />
    </div>
  );
}
