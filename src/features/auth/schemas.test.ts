import { describe, expect, it } from "vitest";

import { passwordSchema, resetPasswordSchema, signUpSchema, usernameSchema } from "./schemas";

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe("usernameSchema", () => {
  it("normalizes to trimmed lowercase", () => {
    expect(usernameSchema.parse("  Maya_K ")).toBe("maya_k");
  });

  it.each([
    ["ab", "Use at least 3 characters"],
    ["a".repeat(21), "Use 20 characters or fewer"],
    ["has space", "Only letters, numbers, periods and underscores"],
    [".maya", "Periods can't be at the start, the end, or next to each other"],
    ["maya.", "Periods can't be at the start, the end, or next to each other"],
    ["ma..ya", "Periods can't be at the start, the end, or next to each other"],
  ])("rejects %j", (value, message) => {
    expect(firstError(usernameSchema.safeParse(value))).toBe(message);
  });
});

describe("passwordSchema", () => {
  it("accepts 8+ characters with a letter and a number", () => {
    expect(passwordSchema.safeParse("konnect123").success).toBe(true);
  });

  it.each([
    ["short1", "Use at least 8 characters"],
    ["onlyletters", "Include at least one number"],
    ["12345678", "Include at least one letter"],
  ])("rejects %j", (value, message) => {
    expect(firstError(passwordSchema.safeParse(value))).toBe(message);
  });
});

describe("signUpSchema", () => {
  it("normalizes the email", () => {
    const result = signUpSchema.parse({
      fullName: " Maya K ",
      username: "maya",
      email: "  Maya@Example.COM ",
      password: "konnect123",
    });
    expect(result).toMatchObject({ fullName: "Maya K", email: "maya@example.com" });
  });
});

describe("resetPasswordSchema", () => {
  it("reports mismatched passwords on the confirm field", () => {
    const result = resetPasswordSchema.safeParse({
      password: "konnect123",
      confirmPassword: "konnect124",
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ["confirmPassword"],
      message: "Passwords don't match",
    });
  });
});
