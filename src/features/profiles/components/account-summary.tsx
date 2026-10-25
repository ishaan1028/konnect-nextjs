"use client";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { avatarUrl } from "@/lib/storage";

import { useCurrentUser } from "../hooks";

/**
 * Who's signed in, inside the sidebar's account menu button: avatar, name and
 * @username (the icon rail shows just the avatar). Presentational: it sits
 * inside a button. Render inside a CurrentUserBoundary.
 */
export function AccountSummary() {
  const user = useCurrentUser();
  const name = user ? user.fullName || user.username : "Not signed in";

  return (
    <>
      <UserAvatar
        name={user ? name : "?"}
        src={avatarUrl(user?.avatarPath)}
        pixelSize={36}
        className="size-9 shrink-0"
      />
      <span className="min-w-0 text-sm max-xl:hidden">
        <span className="block truncate font-semibold">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {user ? `@${user.username}` : "Log in to join in"}
        </span>
      </span>
    </>
  );
}

/** The same size as AccountSummary, while the user streams in. */
export function AccountSummarySkeleton() {
  return (
    <>
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <span aria-hidden className="space-y-1.5 max-xl:hidden">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-16" />
      </span>
    </>
  );
}
