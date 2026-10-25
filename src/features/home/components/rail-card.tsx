import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

/** A compact card for the home page's side rail: a title, an optional link, content. */
export function RailCard({
  title,
  id,
  action,
  children,
}: {
  title: string;
  id: string;
  action?: { href: Route; label: string };
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="rounded-3xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id={id} className="text-sm font-semibold">
          {title}
        </h2>
        {action && (
          <Link
            href={action.href}
            className="rounded-md text-xs font-semibold hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
