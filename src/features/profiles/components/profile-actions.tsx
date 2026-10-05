"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { FollowButton } from "@/features/follows/components/follow-button";
import { followStatusQueryOptions } from "@/features/follows/queries";
import { createClient } from "@/lib/supabase/client";

import { useCurrentUser } from "../hooks";

/**
 * Viewer-specific actions on a profile. The profile itself is cached and
 * public; whether it's *yours* is personal, so it's decided here on the client
 * (render inside a ViewerFollowBoundary).
 */
export function ProfileActions({ profileId, username }: { profileId: string; username: string }) {
  const user = useCurrentUser();

  // Signed out: FollowButton renders a "Follow" link to log in.
  if (!user) return <FollowButton profileId={profileId} username={username} />;
  if (user.id !== profileId)
    return <ViewerFollowButton profileId={profileId} username={username} />;

  return (
    <Link href="/settings/profile" className={buttonVariants({ variant: "secondary", size: "sm" })}>
      <Settings aria-hidden data-icon="inline-start" />
      Edit profile
    </Link>
  );
}

/**
 * Waits (suspends) for the follow status the boundary prefetched, so the
 * button's first paint is its real state ("Following"), never a flicker from
 * "Follow". A return visit reads the cache and doesn't wait at all.
 */
function ViewerFollowButton({ profileId, username }: { profileId: string; username: string }) {
  const { data: status } = useSuspenseQuery(followStatusQueryOptions(createClient(), profileId));
  return <FollowButton profileId={profileId} username={username} initialStatus={status} />;
}
