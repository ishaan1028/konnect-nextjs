import Link from "next/link";
import { Suspense } from "react";

import { Logo, LogoMark } from "@/components/brand/logo";
import { AccountMenuItems } from "@/features/auth/components/account-menu-items";
import { CurrentUserBoundary } from "@/features/profiles/components/current-user-boundary";
import {
  ProfileNavLink,
  ProfileNavLinkSkeleton,
} from "@/features/profiles/components/profile-nav-link";

import { MoreMenu } from "./more-menu";
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
        className="mb-8 flex h-12 items-center rounded-2xl px-2 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none max-xl:justify-center max-xl:px-0"
      >
        <Logo className="max-xl:hidden" />
        <LogoMark className="size-9 xl:hidden" />
      </Link>

      <nav aria-label="Main" className="flex flex-1 flex-col">
        <ul className="flex flex-col gap-1.5">
          {primaryNavItems.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              {/* Rendered here on the server; only the element crosses to the client. */}
              <SideNavLink href={href} label={label} icon={<Icon aria-hidden />} />
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

      <MoreMenu
        variant="rail"
        account={
          // Only the account items stream in; the menu stays the same instance.
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
