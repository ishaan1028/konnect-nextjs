import { z } from "zod";

/*
 * Shared by the forms (instant feedback) and the Server Actions (the real
 * check). The client can be bypassed, so the server always re-validates.
 * The database enforces the same username rules, plus the reserved names.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }));

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  // bcrypt (used by Supabase Auth) ignores everything after 72 bytes.
  .max(72, "Use 72 characters or fewer")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters")
  .max(20, "Use 20 characters or fewer")
  .regex(/^[a-z0-9._]+$/, "Only letters, numbers, periods and underscores")
  .refine((value) => !/^\.|\.$|\.\./.test(value), {
    error: "Periods can't be at the start, the end, or next to each other",
  });

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Enter your name")
  .max(50, "Use 50 characters or fewer");

export const signUpSchema = z.object({
  fullName: fullNameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  // No strength rules on sign-in: just "did you type something".
  password: z.string().min(1, "Enter your password"),
  // Where to go after signing in; sanitized on the server with safeNextPath().
  next: z.string().optional(),
});

export const emailOnlySchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignInInput = z.input<typeof signInSchema>;
export type EmailOnlyInput = z.input<typeof emailOnlySchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
