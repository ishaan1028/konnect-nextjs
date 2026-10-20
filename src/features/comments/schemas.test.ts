import { describe, expect, it } from "vitest";

import { addCommentSchema, commentBodySchema, COMMENT_MAX_LENGTH } from "./schemas";

describe("commentBodySchema", () => {
  it("trims the comment", () => {
    expect(commentBodySchema.parse("  hi there \n")).toBe("hi there");
  });

  it.each([
    ["an empty comment", ""],
    ["only spaces and new lines", "  \n\t "],
    ["a comment over the limit", "x".repeat(COMMENT_MAX_LENGTH + 1)],
  ])("rejects %s", (_, body) => {
    expect(commentBodySchema.safeParse(body).success).toBe(false);
  });

  it("keeps new lines inside a comment", () => {
    expect(commentBodySchema.parse("line one\nline two")).toBe("line one\nline two");
  });
});

describe("addCommentSchema", () => {
  it("needs a real post id", () => {
    expect(addCommentSchema.safeParse({ postId: "not-a-uuid", body: "hi" }).success).toBe(false);
  });
});
