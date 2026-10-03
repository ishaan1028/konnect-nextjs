"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const sections = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/account", label: "Account" },
  { href: "/settings/appearance", label: "Appearance" },
] as const satisfies readonly { href: Route; label: string }[];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections">
      <ul className="flex gap-1 overflow-x-auto rounded-full bg-muted p-1 md:flex-col md:rounded-3xl">
        {sections.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-full px-4 py-2 text-sm font-medium transition-colors md:rounded-2xl",
                  "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
