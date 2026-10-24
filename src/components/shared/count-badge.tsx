"use client";

import { useSyncExternalStore } from "react";

import { pluralize } from "@/lib/format";

const noop = () => () => {};

/**
 * A small red count on a nav icon ("3", "9+"). Absolutely positioned (inside
 * a `relative` wrapper), so it never shifts the nav. Renders nothing at 0.
 */
export function CountBadge({
  count,
  singular,
  plural,
}: {
  count: number;
  singular: string;
  plural: string;
}) {
  // Nothing until hydrated: the server has no count, and a nav link that
  // hydrates late may already see one fetched by another badge (a mismatch).
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  if (!hydrated || count === 0) return null;

  return (
    <span className="absolute -top-1.5 -right-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] leading-none font-semibold text-white">
      <span aria-hidden>{count > 9 ? "9+" : count}</span>
      <span className="sr-only">
        , {count} {pluralize(count, singular, plural)}
      </span>
    </span>
  );
}
