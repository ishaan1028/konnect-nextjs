"use client";

import { formatDate, formatRelativeTime } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/**
 * "5m", "3h", "2d"… in a <time> element, with the full date on hover.
 *
 * The server renders it a moment before the browser hydrates it, so the text
 * can legitimately differ (59m → 1h); suppressHydrationWarning tells React
 * that's expected for this one element. It updates every minute.
 */
export function RelativeTime({ date, className }: { date: string; className?: string }) {
  const now = useNow();
  return (
    <time
      dateTime={date}
      title={formatDate(date)}
      suppressHydrationWarning
      className={cn("tabular-nums", className)}
    >
      {formatRelativeTime(date, now)}
    </time>
  );
}
