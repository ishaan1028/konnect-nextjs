"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/features/profiles/hooks";

import { signOutAction } from "../actions";

/**
 * The account part of the More menu: who's signed in and "Log out", or
 * "Log in" for visitors. Rendered through the menu's `account` slot inside a
 * <CurrentUserBoundary>, so only these items stream in and the menu itself
 * (and its open/closed state) never gets swapped out.
 */
export function AccountMenuItems() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const signOut = useAction(signOutAction, {
    // The action redirects to /login. Drop every cached query on the way out so
    // the next person using this browser can't see the previous user's data.
    onNavigation: () => queryClient.clear(),
  });

  if (!user) {
    return (
      <DropdownMenuLinkItem render={<Link href="/login" />}>
        <LogIn aria-hidden />
        Log in
      </DropdownMenuLinkItem>
    );
  }

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="truncate">
        Signed in as <span className="font-semibold text-foreground">@{user.username}</span>
      </DropdownMenuLabel>
      {/* Signs out on the server (revoking the refresh token), clears cached
          pages, and redirects to /login. */}
      <DropdownMenuItem
        variant="destructive"
        disabled={signOut.isPending}
        onClick={() => signOut.execute()}
      >
        <LogOut aria-hidden />
        {signOut.isPending ? "Logging out…" : "Log out"}
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}
