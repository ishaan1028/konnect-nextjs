import { Compass } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader title="Explore" description="Discover new people and posts." />
      <ComingSoon
        icon={Compass}
        title="A grid full of inspiration"
        description="Fresh posts from people you don't follow yet, plus user search."
        phase={9}
      />
    </div>
  );
}
