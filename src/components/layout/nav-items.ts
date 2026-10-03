import { Bookmark, Compass, House, type LucideIcon, MessageCircle, SquarePlus } from "lucide-react";
import type { Route } from "next";

export type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

// "Profile" isn't listed here: its link depends on who's signed in, so it's
// rendered separately by ProfileNavLink (features/profiles).

export const primaryNavItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/create", label: "Create", icon: SquarePlus },
  { href: "/saved", label: "Saved", icon: Bookmark },
] as const satisfies readonly NavItem[];

// Instagram-style bottom bar: four destinations, plus Profile at the end.
export const mobileTabItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/create", label: "Create", icon: SquarePlus },
  { href: "/messages", label: "Messages", icon: MessageCircle },
] as const satisfies readonly NavItem[];

/** "/" matches only itself; other items also match their sub-routes. */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
