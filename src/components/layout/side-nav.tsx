import { Camera, Heart, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Logo, LogoMark } from "@/components/brand/logo";
import { Separator } from "@/components/ui/separator";
import { AccountMenuItems } from "@/features/auth/components/account-menu-items";
import {
  AccountSummary,
  AccountSummarySkeleton,
} from "@/features/profiles/components/account-summary";
import { CurrentUserBoundary } from "@/features/profiles/components/current-user-boundary";
import {
  ProfileNavLink,
  ProfileNavLinkSkeleton,
} from "@/features/profiles/components/profile-nav-link";

import { MoreMenu } from "./more-menu";
import { navIcon } from "./nav-icon";
import { primaryNavItems } from "./nav-items";
import { SideNavLink } from "./nav-link";

/**
 * Desktop navigation rail (md and up).
 * md–xl: icon-only 76px rail with tooltips. xl+: 244px rail with labels.
 * Purely responsive CSS, no JS state, so it's part of the static shell.
 */
export function SideNav() {
  return (
    <header className="fixed inset-y-0 left-0 z-40 hidden w-19 flex-col border-r bg-background/80 px-3 py-6 backdrop-blur-xl md:flex xl:w-61">
      <Link
        href="/"
        aria-label="Konnect home"
        className="relative mb-6 flex h-16 items-center gap-2 overflow-hidden rounded-2xl bg-linear-to-br from-primary/15 via-primary/5 to-transparent px-3 ring-1 ring-primary/10 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none max-xl:h-12 max-xl:justify-center max-xl:px-0 dark:from-primary/30 dark:via-primary/10"
      >
        <Logo className="max-xl:hidden" />
        <LogoMark className="size-9 xl:hidden" />
        {/* Decoration only, in its own space beside the name (never under
            it): a soft glow and a scatter of social motifs. */}
        <span aria-hidden className="relative ml-auto h-full w-14 shrink-0 max-xl:hidden">
          <span className="absolute top-1/2 right-0 size-11 -translate-y-1/2 rounded-full bg-primary/20 blur-lg" />
          <Heart className="absolute top-2.5 right-1 size-4 rotate-12 fill-current text-primary/45" />
          <Camera className="absolute top-3 left-1 size-3.5 -rotate-6 text-primary/35" />
          <MessageCircle className="absolute bottom-2.5 left-3.5 size-3.5 -rotate-12 text-primary/40" />
          <Sparkles className="absolute right-1 bottom-3 size-3 text-primary/45" />
          <span className="absolute top-1/2 left-1.5 size-1 rounded-full bg-primary/40" />
        </span>
      </Link>

      <nav aria-label="Main" className="flex flex-1 flex-col">
        <ul className="flex flex-col gap-1.5">
          {primaryNavItems.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              {/* Rendered here on the server; only the element crosses to the client. */}
              <SideNavLink href={href} label={label} icon={navIcon(href, <Icon aria-hidden />)} />
            </li>
          ))}
          <li>
            {/* The only user-specific part of the rail: it streams in, while
                everything else here is part of the prerendered static shell. */}
            <Suspense fallback={<ProfileNavLinkSkeleton variant="rail" />}>
              <CurrentUserBoundary>
                <ProfileNavLink variant="rail" />
              </CurrentUserBoundary>
            </Suspense>
          </li>
        </ul>
      </nav>

      <Separator className="my-3" />
      <MoreMenu
        variant="rail"
        summary={
          // Only who's signed in streams in; the trigger stays the same instance.
          <Suspense fallback={<AccountSummarySkeleton />}>
            <CurrentUserBoundary>
              <AccountSummary />
            </CurrentUserBoundary>
          </Suspense>
        }
        account={
          <Suspense fallback={null}>
            <CurrentUserBoundary>
              <AccountMenuItems />
            </CurrentUserBoundary>
          </Suspense>
        }
      />
    </header>
  );
}
