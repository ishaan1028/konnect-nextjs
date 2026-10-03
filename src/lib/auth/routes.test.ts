import { describe, expect, it } from "vitest";

import { isAuthPage, isProtectedPath } from "./routes";

describe("isProtectedPath", () => {
  it.each(["/", "/explore", "/messages/abc", "/settings/profile", "/create"])(
    "protects %s",
    (path) => expect(isProtectedPath(path)).toBe(true),
  );

  it.each(["/alex.demo", "/alex.demo/followers", "/p/123", "/login", "/auth/confirm"])(
    "leaves %s public",
    (path) => expect(isProtectedPath(path)).toBe(false),
  );

  it("does not match routes that merely share a prefix", () => {
    expect(isProtectedPath("/settingsx")).toBe(false);
  });
});

describe("isAuthPage", () => {
  it.each(["/login", "/signup", "/forgot-password"])("treats %s as an auth page", (path) =>
    expect(isAuthPage(path)).toBe(true),
  );

  it("does not treat the password reset page as an auth page", () => {
    // Users arrive there *signed in* via the reset link, so it mustn't bounce them.
    expect(isAuthPage("/reset-password")).toBe(false);
  });
});
