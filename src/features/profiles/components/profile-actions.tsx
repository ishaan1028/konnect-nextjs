"use client";

import { Settings } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { useCurrentUser } from "../hooks";

/**
 * Viewer-specific actions on a profile. The profile itself is cached and
 * public; whether it's *yours* is personal, so it's decided here on the client
 * from the current user (render inside a CurrentUserBoundary).
 * Follow / Message for other people's profiles arrive in phase 7.
 */
export function ProfileActions({ profileId }: { profileId: string }) {
  const user = useCurrentUser();

  if (user?.id !== profileId) return null;

  return (
    <Link href="/settings/profile" className={buttonVariants({ variant: "secondary", size: "sm" })}>
      <Settings aria-hidden data-icon="inline-start" />
      Edit profile
    </Link>
  );
}
