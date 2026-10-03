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
      {/*
        Concentric corners: a rounded item inside a rounded container only looks
        right when outer radius = inner radius + padding.
        - Mobile (a row): pills inside a pill, concentric by definition.
        - md+ (a column): items are rounded-lg, the container is padded by
          1.5 (6px), so its radius is exactly radius-lg + 6px, even if the
          theme's --radius changes.
      */}
      <ul className="flex gap-1 overflow-x-auto rounded-full bg-muted p-1 md:flex-col md:rounded-[calc(var(--radius-lg)+--spacing(1.5))] md:p-1.5">
        {sections.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-full px-4 py-2 text-sm font-medium transition-colors md:rounded-lg md:px-3.5",
                  "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : // Not text-muted-foreground: on the bg-muted pill that is 4.34:1, below WCAG AA (4.5:1).
                      "text-foreground/75 hover:bg-background/60 hover:text-foreground",
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
