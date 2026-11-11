import type { Metadata } from "next";

import { FollowListPage, followListMetadata } from "@/features/follows/components/follow-list-page";

export function generateMetadata({
  params,
}: PageProps<"/[username]/followers">): Promise<Metadata> {
  return followListMetadata(params, "followers");
}

export default function FollowersPage({ params }: PageProps<"/[username]/followers">) {
  return <FollowListPage params={params} kind="followers" />;
}
