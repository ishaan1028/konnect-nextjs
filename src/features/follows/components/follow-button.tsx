"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { useCurrentUser } from "@/features/profiles/hooks";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { useToggleFollow } from "../hooks";
import { type FollowStatus, followStatusQueryOptions } from "../queries";

type FollowButtonProps = {
  profileId: string;
  username: string;
  /**
   * Known status (e.g. from a followers list row), so lists don't fire one
   * status request per person. Without it the status is fetched (or read from
   * a server prefetch).
   */
  initialStatus?: FollowStatus;
  className?: string;
};

/**
 * Follow / Following / Follow back. Render inside a CurrentUserBoundary.
 * Signed-out visitors get a "Follow" link to log in and come straight back.
 */
export function FollowButton({ profileId, username, initialStatus, className }: FollowButtonProps) {
  const user = useCurrentUser();
  const { data: status } = useQuery({
    ...followStatusQueryOptions(createClient(), profileId),
    ...(initialStatus ? { initialData: initialStatus } : {}),
    enabled: !!user && user.id !== profileId,
  });
  const toggle = useToggleFollow(profileId);

  if (!user) {
    return (
      <Link
        // Encode like the proxy does (URLSearchParams), never raw string concatenation.
        href={`/login?${new URLSearchParams({ next: `/${username}` })}` as Route}
        className={cn(buttonVariants({ size: "sm" }), className)}
      >
        Follow
      </Link>
    );
  }
  if (user.id === profileId) return null;

  const following = status?.isFollowing ?? false;
  const label = following ? "Following" : status?.isFollowedBy ? "Follow back" : "Follow";

  return (
    <Button
      size="sm"
      variant={following ? "secondary" : "default"}
      // Toggle button: the state is aria-pressed; the name includes the visible
      // text (WCAG "label in name") plus who it's about.
      aria-pressed={following}
      aria-label={`${label} @${username}`}
      disabled={!status}
      onClick={() => toggle.mutate(!following)}
      className={cn("min-w-24", className)}
    >
      {label}
    </Button>
  );
}
