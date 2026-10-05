"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { profileIdQueryOptions } from "@/features/profiles/queries";
import { createClient } from "@/lib/supabase/client";

import type { FollowListKind } from "../queries";
import { FollowList } from "./follow-list";

/**
 * The list inside the followers/following modal, fetched in the browser.
 *
 * A modal only opens on client-side navigation, where TanStack Query's cache
 * already lives: reopening a list shows the cached people instantly (and
 * refetches in the background once they're stale) instead of a skeleton.
 * The full page, which can be a first visit, prefetches on the server instead
 * (FollowListLoader). Render inside <Suspense>.
 */
export function FollowListModalContent({ kind }: { kind: FollowListKind }) {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username).toLowerCase();
  const { data: profileId } = useSuspenseQuery(profileIdQueryOptions(createClient(), username));

  if (!profileId) {
    return (
      <p className="py-10 text-center text-muted-foreground">This account doesn&apos;t exist.</p>
    );
  }
  return <FollowList profileId={profileId} kind={kind} />;
}
