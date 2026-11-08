import { describe, expect, it } from "vitest";

import {
  COMMENTS_BY_POST,
  GENERAL_COMMENTS,
  JOB_COMMENTS,
  JOB_MESSAGES,
  MESSAGES_BY_PERSON,
  REPLIES,
} from "./lines";
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

  it("gives everyone enough messages for a week without repeats", () => {
    const perPersonPerWeek = Math.ceil((DAILY_TARGETS.message / 5) * 7);
    for (const lines of Object.values(MESSAGES_BY_PERSON)) {
      expect(new Set(lines).size).toBeGreaterThanOrEqual(perPersonPerWeek);
    }
  });

  it("has plenty of distinct texts in every list", () => {
    const lists: [string, readonly string[], number][] = [
      ["replies", REPLIES, 40],
      ["general comments", GENERAL_COMMENTS, 40],
      ...Object.entries(COMMENTS_BY_POST).map(
        ([post, lines]) =>
          [`comments on ${post}`, lines, 10] as [string, readonly string[], number],
      ),
      ...Object.entries(MESSAGES_BY_PERSON).map(
        ([person, lines]) =>
          [`${person}'s messages`, lines, 24] as [string, readonly string[], number],
      ),
    ];
    for (const [name, lines, atLeast] of lists) {
      expect(new Set(lines).size, `${name} has a duplicate`).toBe(lines.length);
      expect(lines.length, name).toBeGreaterThanOrEqual(atLeast);
    }
  });
});
