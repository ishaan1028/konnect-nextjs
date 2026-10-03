import { ImagePlus } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "New post" };

export default function CreatePostPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="New post" description="Share a photo with your followers." />
      <ComingSoon
        icon={ImagePlus}
        title="Drop a photo to get started"
        description="Crop, add alt text, a caption and a location, then post."
        phase={8}
      />
    </div>
  );
}
