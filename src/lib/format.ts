const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** 950 → "950", 1_234 → "1.2K", 2_500_000 → "2.5M". Locale-fixed so server and client agree. */
export function formatCount(value: number): string {
  return compact.format(value);
}

const longDate = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

/** "October 6, 2026". Locale and time zone are fixed so server and client agree. */
export function formatDate(iso: string): string {
  return longDate.format(new Date(iso));
}

/** "1 post" / "2 posts": picks the word for a count (English-only app). */
export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

const monthDay = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const monthDayYear = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Instagram-style short age: "now", "5m", "3h", "2d", "3w", then a date
 * ("Oct 6", or "Oct 6, 2024" for other years).
 */
export function formatRelativeTime(iso: string, now: number): string {
  const date = new Date(iso);
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 28) return `${Math.floor(days / 7)}w`;
  const sameYear = date.getUTCFullYear() === new Date(now).getUTCFullYear();
  return (sameYear ? monthDay : monthDayYear).format(date);
}
