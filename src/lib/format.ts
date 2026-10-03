const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** 950 → "950", 1_234 → "1.2K", 2_500_000 → "2.5M". Locale-fixed so server and client agree. */
export function formatCount(value: number): string {
  return compact.format(value);
}
