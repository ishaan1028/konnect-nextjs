"use client";

import { formatDate, formatRelativeTime, formatShortDate } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/**
 * "5m", "3h", "2d"… in a <time> element, with the full date on hover.
 *
 * The server can't know the browser's "now", so it renders the date ("Oct 6")
 * and the browser switches to the relative age right after hydrating: the HTML
 * and the first client render always match, and no clock is read while
 * prerendering. It then updates every minute.
 */
export function RelativeTime({ date, className }: { date: string; className?: string }) {
  const now = useNow();
  return (
    <time dateTime={date} title={formatDate(date)} className={cn("tabular-nums", className)}>
      {now === null ? formatShortDate(date) : formatRelativeTime(date, now)}
    </time>
  );
}
