/**
 * When the demo-activity job acts. It runs every 15 minutes but usually does
 * nothing: each action has a small chance per run, weighted by the time of day
 * in India, so a day adds up to about DAILY_TARGETS and feels like people
 * (busier in the evening, quiet at night) rather than a bot.
 */

/** About how many of each a day. */
export const DAILY_TARGETS = { like: 8, comment: 4, message: 5, follow: 1 } as const;

const RUNS_PER_HOUR = 4;

/** How active people are at each hour (IST, 0–23), relative to the afternoon. */
function hourWeight(hour: number) {
  if (hour < 8) return 0.1;
  if (hour < 12) return 0.8;
  if (hour < 18) return 1;
  return 1.6;
}

const WEIGHT_PER_DAY = Array.from({ length: 24 }, (_, hour) => hourWeight(hour)).reduce(
  (sum, weight) => sum + weight * RUNS_PER_HOUR,
  0,
);

/** The hour in India (UTC+5:30) at `date`. */
export function istHour(date: Date) {
  return Math.floor((((date.getTime() / 3_600_000 + 5.5) % 24) + 24) % 24);
}

/** The chance (0–1) that one run does something meant to happen `perDay` times a day. */
export function actionChance(perDay: number, date: Date) {
  return Math.min(1, (perDay * hourWeight(istHour(date))) / WEIGHT_PER_DAY);
}

/** A random item; callers check the list isn't empty. */
export function pick<T>(items: readonly T[], random = Math.random): T {
  return items[Math.floor(random() * items.length)]!;
}

/**
 * A random text that isn't in `used` (what this person said recently), so
 * nobody repeats themselves within the window. Falls back to any text once
 * they've used them all.
 */
export function pickFresh(
  pool: readonly string[],
  used: ReadonlySet<string>,
  random = Math.random,
) {
  const fresh = pool.filter((text) => !used.has(text));
  return pick(fresh.length ? fresh : pool, random);
}
