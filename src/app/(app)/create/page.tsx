import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { PostComposer } from "@/features/posts/components/post-composer";

export const metadata: Metadata = { title: "New post" };

// The composer needs no server data (the upload reads the session in the
// browser), so this whole page is part of the static shell: it's instant.
export default function CreatePostPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="New post" description="Share a photo with your followers." />
      <PostComposer />
    </div>
  );
}
