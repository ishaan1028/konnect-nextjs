import { describe, expect, it } from "vitest";

import { getInitials } from "./initials";

describe("getInitials", () => {
  it.each([
    ["Dario Altman", "DA"],
    ["maya", "M"],
    ["  Ana  María   López ", "AL"],
    ["", "?"],
  ])("%j → %j", (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});
