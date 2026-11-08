import { describe, expect, it } from "vitest";

import { JOB_COMMENTS, JOB_MESSAGES } from "./lines";
import { actionChance, DAILY_TARGETS, istHour, pickFresh } from "./plan";

/** A run at `hh:mm` IST on some day. */
const ist = (hh: number, mm = 0) => new Date(Date.UTC(2026, 10, 9, hh, mm) - 5.5 * 3_600_000);

describe("demo activity plan", () => {
  it("reads the hour in India", () => {
    expect(istHour(new Date(Date.UTC(2026, 10, 9, 3, 30)))).toBe(9); // 03:30 UTC
    expect(istHour(new Date(Date.UTC(2026, 10, 9, 20, 0)))).toBe(1); // 01:30 IST next day
    expect(istHour(ist(23, 59))).toBe(23);
  });

  it("adds up to the daily targets over a day of 15-minute runs", () => {
    for (const perDay of Object.values(DAILY_TARGETS)) {
      let expected = 0;
      for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
        expected += actionChance(perDay, ist(0, minutes));
      }
      expect(expected).toBeCloseTo(perDay, 6);
    }
  });

  it("is busier in the evening than at night", () => {
    expect(actionChance(8, ist(20))).toBeGreaterThan(actionChance(8, ist(14)));
    expect(actionChance(8, ist(3))).toBeLessThan(actionChance(8, ist(10)) / 4);
  });

  it("doesn't repeat what someone said recently, until they've said everything", () => {
    const pool = ["a", "b", "c"];
    for (let i = 0; i < 50; i++) expect(pickFresh(pool, new Set(["a", "b"]))).toBe("c");
    expect(pool).toContain(pickFresh(pool, new Set(pool)));
  });

  it("keeps every job text distinct from the seed's own comments", async () => {
    const seed = (await import("../../../supabase/seed/posts.json")).default as {
      comments?: { body: string }[];
    }[];
    const seeded = new Set(seed.flatMap((post) => post.comments ?? []).map((c) => c.body));
    expect(JOB_COMMENTS.filter((text) => seeded.has(text))).toEqual([]);
    expect(JOB_MESSAGES.length).toBeGreaterThan(40);
  });
});
