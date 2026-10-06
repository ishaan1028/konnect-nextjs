import { describe, expect, it } from "vitest";

import { formatCount, formatDate, formatRelativeTime, pluralize } from "./format";

describe("formatCount", () => {
  it.each([
    [0, "0"],
    [950, "950"],
    [1234, "1.2K"],
    [2_500_000, "2.5M"],
  ])("%i → %s", (value, expected) => {
    expect(formatCount(value)).toBe(expected);
  });
});

describe("formatDate", () => {
  it("formats in UTC, whatever the machine's time zone", () => {
    expect(formatDate("2026-10-06T23:30:00Z")).toBe("October 6, 2026");
  });
});

describe("pluralize", () => {
  it.each([
    [0, "posts"],
    [1, "post"],
    [2, "posts"],
  ])("%i → %s", (count, expected) => {
    expect(pluralize(count, "post", "posts")).toBe(expected);
  });
});

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-10-06T12:00:00Z");
  it.each([
    ["2026-10-06T11:59:30Z", "now"],
    ["2026-10-06T11:55:00Z", "5m"],
    ["2026-10-06T09:00:00Z", "3h"],
    ["2026-10-04T12:00:00Z", "2d"],
    ["2026-09-15T12:00:00Z", "3w"],
    ["2026-08-01T12:00:00Z", "Aug 1"],
    ["2025-12-24T12:00:00Z", "Dec 24, 2025"],
    // A clock running slightly ahead never shows a negative age.
    ["2026-10-06T12:00:05Z", "now"],
  ])("%s → %s", (iso, expected) => {
    expect(formatRelativeTime(iso, now)).toBe(expected);
  });
});
