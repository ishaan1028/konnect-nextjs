import { describe, expect, it } from "vitest";

import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps same-site paths, including query and hash", () => {
    expect(safeNextPath("/explore")).toBe("/explore");
    expect(safeNextPath("/p/123?comment=4#reply")).toBe("/p/123?comment=4#reply");
  });

  it("falls back when next is missing", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined, "/settings")).toBe("/settings");
    expect(safeNextPath("")).toBe("/");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "evil.example/path",
  ])("rejects open-redirect attempt %s", (attack) => {
    expect(safeNextPath(attack)).toBe("/");
  });
});
