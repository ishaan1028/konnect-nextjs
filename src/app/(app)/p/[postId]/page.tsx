import { ImageIcon } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Post" };

export default function PostPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Post" />
      <ComingSoon
        icon={ImageIcon}
        title="Post details"
        description="The photo, caption, likes and the full comment thread."
        phase={9}
      />
    </div>
  );
}
