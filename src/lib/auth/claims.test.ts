import { describe, expect, it } from "vitest";

import { isSignedOutError } from "./claims";

describe("isSignedOutError", () => {
  it.each([
    [null, true],
    [{ name: "AuthSessionMissingError" }, true],
    [{ name: "AuthInvalidJwtError" }, true],
    [{ name: "AuthRetryableFetchError" }, false],
    [{ name: "TypeError" }, false],
  ])("%j → %s", (error, expected) => {
    expect(isSignedOutError(error)).toBe(expected);
  });
});
