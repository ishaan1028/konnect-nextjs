import { describe, expect, it } from "vitest";

import { formatCount, formatDate, pluralize } from "./format";

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
