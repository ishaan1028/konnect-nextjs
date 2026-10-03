import { describe, expect, it } from "vitest";

import { getInitials } from "./initials";

describe("getInitials", () => {
  it.each([
    ["Alex Rivera", "AR"],
    ["maya", "M"],
    ["  Ana  María   López ", "AL"],
    ["", "?"],
  ])("%j → %j", (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});
