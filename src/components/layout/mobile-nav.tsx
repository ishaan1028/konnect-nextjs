import Link from "next/link";

import { Logo } from "@/components/brand/logo";

import { MoreMenu } from "./more-menu";
import { mobileTabItems } from "./nav-items";
import { TabBarLink } from "./nav-link";

/** Sticky, translucent top bar shown below the md breakpoint. */
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-xl md:hidden">
      <Link
        href="/"
        aria-label="Konnect home"
        className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <Logo />
      </Link>
      <MoreMenu variant="icon" />
    </header>
  );
}

/** Thumb-friendly tab bar; respects the iOS home-indicator safe area. */
export function BottomTabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {mobileTabItems.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <TabBarLink href={href} label={label} icon={<Icon aria-hidden />} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
