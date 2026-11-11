import type { Metadata } from "next";

import { FollowListPage, followListMetadata } from "@/features/follows/components/follow-list-page";

export function generateMetadata({
  params,
}: PageProps<"/[username]/following">): Promise<Metadata> {
  return followListMetadata(params, "following");
}

export default function FollowingPage({ params }: PageProps<"/[username]/following">) {
  return <FollowListPage params={params} kind="following" />;
}
