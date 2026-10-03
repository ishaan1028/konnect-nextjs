"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { isNavItemActive } from "./nav-items";

type NavLinkProps = {
  href: Route;
  label: string;
  /**
   * An already-rendered icon element, not the icon component. Props passed from
   * a Server Component to a Client Component must be serializable: an element
   * is, a component function isn't.
   */
  icon: ReactNode;
};

type NavLinkViewProps = NavLinkProps & { active: boolean };

// The active page gets a heavier icon stroke, driven by aria-current, so
// accessibility state and visual state can never disagree.
const activeIcon = "[&[aria-current=page]_svg]:stroke-[2.6]";

function SideNavLinkView({ href, label, icon, active }: NavLinkViewProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex h-12 items-center gap-4 rounded-2xl px-3 text-[0.95rem] text-foreground/80 transition-colors",
              "hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
              "aria-[current=page]:font-semibold aria-[current=page]:text-foreground",
              "max-xl:justify-center max-xl:px-0",
              "[&_svg]:size-6 [&_svg]:shrink-0 [&_svg]:transition-transform hover:[&_svg]:scale-105 active:[&_svg]:scale-95",
              activeIcon,
            )}
          />
        }
      >
        {icon}
        <span className="max-xl:sr-only">{label}</span>
      </TooltipTrigger>
      {/* The visible label covers xl screens; the tooltip helps on the icon-only rail. */}
      <TooltipContent side="right" className="xl:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function TabBarLinkView({ href, label, icon, active }: NavLinkViewProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex size-12 items-center justify-center rounded-2xl text-foreground/70 transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-95",
        "aria-[current=page]:text-foreground [&_svg]:size-6.5",
        activeIcon,
      )}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </Link>
  );
}

function ActiveSideNavLink(props: NavLinkProps) {
  return <SideNavLinkView {...props} active={isNavItemActive(props.href, usePathname())} />;
}

function ActiveTabBarLink(props: NavLinkProps) {
  return <TabBarLinkView {...props} active={isNavItemActive(props.href, usePathname())} />;
}

/*
 * Why <Suspense>? With Cache Components, the URL of a route with an unknown
 * dynamic param (e.g. /[username]) isn't known at build time, so usePathname()
 * suspends during prerendering. The fallback is the same link without the
 * highlight: the static shell is complete and identical in size (no layout
 * shift), and the highlight resolves as soon as the real path is known.
 */

export function SideNavLink(props: NavLinkProps) {
  return (
    <Suspense fallback={<SideNavLinkView {...props} active={false} />}>
      <ActiveSideNavLink {...props} />
    </Suspense>
  );
}

export function TabBarLink(props: NavLinkProps) {
  return (
    <Suspense fallback={<TabBarLinkView {...props} active={false} />}>
      <ActiveTabBarLink {...props} />
    </Suspense>
  );
}
