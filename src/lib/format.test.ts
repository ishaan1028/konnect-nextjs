import { describe, expect, it } from "vitest";

import { formatCount } from "./format";

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
