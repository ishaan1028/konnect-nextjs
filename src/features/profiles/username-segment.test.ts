import { describe, expect, it } from "vitest";

import { usernameFromSegment } from "./username-segment";

describe("usernameFromSegment", () => {
  it.each([
    ["Maya.K", "maya.k"],
    ["maya%2Ek", "maya.k"],
    // Decoded once: an encoded "%" stays a "%" (no such user), it isn't decoded again.
    ["%2541lice", "%41lice"],
    ["%25", "%"],
    // A malformed escape names no one instead of throwing.
    ["%E0", ""],
  ])("%j → %j", (segment, username) => {
    expect(usernameFromSegment(segment)).toBe(username);
  });
});
