"use client";

import { LogIn } from "lucide-react";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import { isNavItemActive } from "@/components/layout/nav-items";
import { SideNavLinkView, TabBarLinkView } from "@/components/layout/nav-link";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { avatarUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

import { useCurrentUser } from "../hooks";

type Variant = "rail" | "tab";

/**
 * "Profile" in the nav: your avatar, linking to /<your username>.
 * Signed-out visitors (e.g. on a public profile) get "Log in" instead.
 * Render inside <Suspense><CurrentUserBoundary>…</CurrentUserBoundary></Suspense>.
 */
export function ProfileNavLink({ variant }: { variant: Variant }) {
  const user = useCurrentUser();
  const pathname = usePathname();
  const View = variant === "rail" ? SideNavLinkView : TabBarLinkView;

  if (!user) {
    return <View href="/login" label="Log in" icon={<LogIn aria-hidden />} active={false} />;
  }

  // A runtime value, so it's cast to a typed route (per the Next.js docs).
  const href = `/${user.username}` as Route;
  const active = isNavItemActive(href, pathname);

  return (
    <View
      href={href}
      label="Profile"
      active={active}
      icon={
        <UserAvatar
          name={user.fullName}
          src={avatarUrl(user.avatarPath)}
          size="sm"
          className={cn(
            "size-6.5",
            // Instagram-style: the active profile avatar gets a ring instead of a bolder icon.
            active && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
          )}
        />
      }
    />
  );
}

/** Same footprint as the link, so nothing shifts when the user streams in. */
export function ProfileNavLinkSkeleton({ variant }: { variant: Variant }) {
  return variant === "rail" ? (
    <div
      aria-hidden
      className="flex h-12 items-center gap-4 px-3 max-xl:justify-center max-xl:px-0"
    >
      <Skeleton className="size-6.5 rounded-full" />
      <Skeleton className="h-3.5 w-14 max-xl:hidden" />
    </div>
  ) : (
    <div aria-hidden className="flex size-12 items-center justify-center">
      <Skeleton className="size-6.5 rounded-full" />
    </div>
  );
}
