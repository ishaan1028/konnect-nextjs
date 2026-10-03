import { describe, expect, it } from "vitest";

import { isNavItemActive } from "./nav-items";

describe("isNavItemActive", () => {
  it("matches Home only on the root path", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/", "/explore")).toBe(false);
  });

  it("matches a section and its sub-routes", () => {
    expect(isNavItemActive("/messages", "/messages")).toBe(true);
    expect(isNavItemActive("/messages", "/messages/abc-123")).toBe(true);
  });

  it("does not match routes that merely share a prefix", () => {
    expect(isNavItemActive("/saved", "/saved-searches")).toBe(false);
  });
});
