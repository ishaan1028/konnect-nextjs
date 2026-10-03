import {
  Bookmark,
  CircleUserRound,
  Compass,
  House,
  type LucideIcon,
  MessageCircle,
  SquarePlus,
} from "lucide-react";
import type { Route } from "next";

export type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

// TODO(phase 5): point Profile at the signed-in user's /[username].
// `satisfies Route<…>` still validates the literal against our routes; `as Route`
// then widens it so it can sit in a list typed as NavItem (per the Next.js docs).
const PROFILE_HREF = "/demo" satisfies Route<"/demo"> as Route;

export const primaryNavItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/create", label: "Create", icon: SquarePlus },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: PROFILE_HREF, label: "Profile", icon: CircleUserRound },
] as const satisfies readonly NavItem[];

// Instagram-style bottom bar: five thumb-reachable destinations.
export const mobileTabItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/create", label: "Create", icon: SquarePlus },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: PROFILE_HREF, label: "Profile", icon: CircleUserRound },
] as const satisfies readonly NavItem[];

/** "/" matches only itself; other items also match their sub-routes. */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
