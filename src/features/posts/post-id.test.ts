import { describe, expect, it } from "vitest";

import { isPostId } from "./post-id";

describe("isPostId", () => {
  it("accepts a UUID, in either case", () => {
    expect(isPostId("5eed1000-0000-4000-8000-000000000012")).toBe(true);
    expect(isPostId("5EED1000-0000-4000-8000-00000000ABCD")).toBe(true);
  });

  it.each(["", "not-a-uuid", "5eed1000-0000-4000-8000-00000000001", "../etc/passwd"])(
    "rejects %j",
    (value) => {
      expect(isPostId(value)).toBe(false);
    },
  );
});
