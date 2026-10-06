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
