"use server";

import { isAuthApiError } from "@supabase/supabase-js";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { returnServerError, returnValidationErrors } from "next-safe-action";

import { profileTag } from "@/features/profiles/server/get-public-profile";
import { safeNextPath } from "@/lib/auth/redirect";
import { env } from "@/lib/env";
import { actionClient, authActionClient } from "@/lib/safe-action";
import { createClient } from "@/lib/supabase/server";

import { emailOnlySchema, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";

const RATE_LIMITED = "Too many attempts. Please wait a minute and try again.";

/** Supabase error code, if this is an error returned by the Auth API. */
function authErrorCode(error: unknown): string | undefined {
  return isAuthApiError(error) ? error.code : undefined;
}

/**
 * Sign-up. Supabase emails a confirmation link; nothing is signed in yet.
 *
 * If the email is already registered, Supabase deliberately returns success
 * without sending anything, so this form can't be used to discover who has an
 * account (the old app answered "this email is already registered").
 */
export const signUpAction = actionClient
  .metadata({ actionName: "signUp" })
  .inputSchema(signUpSchema)
  .action(async ({ parsedInput: { fullName, username, email, password } }) => {
    const supabase = await createClient();

    // Friendly, field-level error for the common case. The unique index and
    // the sign-up trigger still guard against races and reserved names.
    const { data: available, error: rpcError } = await supabase.rpc("is_username_available", {
      username,
    });
    if (rpcError) throw rpcError;
    if (!available) {
      returnValidationErrors(signUpSchema, {
        username: { _errors: ["That username isn't available"] },
      });
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, full_name: fullName } },
    });

    if (error) {
      switch (authErrorCode(error)) {
        case "weak_password":
          returnValidationErrors(signUpSchema, {
            password: { _errors: ["That password is too weak. Try a longer one."] },
          });
        case "over_email_send_rate_limit":
        case "over_request_rate_limit":
          returnServerError(RATE_LIMITED);
        case "signup_disabled":
          returnServerError("Sign-ups are currently closed.");
        default:
          // e.g. someone claimed the username a moment ago (trigger failed).
          throw error;
      }
    }

    // If anyone visited /<username> before it existed, a cached "not found"
    // could hide the new profile; expire it.
    updateTag(profileTag(username));

    return { email };
  });

/** Email + password sign-in, then back to where the user was headed. */
export const signInAction = actionClient
  .metadata({ actionName: "signIn" })
  .inputSchema(signInSchema)
  .action(async ({ parsedInput: { email, password, next } }) => {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      switch (authErrorCode(error)) {
        case "invalid_credentials":
          // One message for "no such user" and "wrong password", so attackers
          // can't probe which emails exist.
          returnServerError("Incorrect email or password.");
        case "email_not_confirmed":
          // Not an error for the UI: it offers to resend the confirmation email.
          return { needsConfirmation: true as const, email };
        case "over_request_rate_limit":
          returnServerError(RATE_LIMITED);
        default:
          throw error;
      }
    }

    // Signing in changes what every page renders: drop all cached RSC output.
    revalidatePath("/", "layout");
    redirect(safeNextPath(next));
  });

/** One-click sign-in to the shared demo account, for reviewers and recruiters. */
export const demoSignInAction = actionClient
  .metadata({ actionName: "demoSignIn" })
  .action(async () => {
    if (!env.DEMO_USER_EMAIL || !env.DEMO_USER_PASSWORD) {
      returnServerError("The demo account isn't available right now.");
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: env.DEMO_USER_EMAIL,
      password: env.DEMO_USER_PASSWORD,
    });
    if (error) throw error;

    revalidatePath("/", "layout");
    redirect("/");
  });

export const signOutAction = actionClient.metadata({ actionName: "signOut" }).action(async () => {
  const supabase = await createClient();
  // Revokes the refresh token server-side and clears the auth cookies.
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
});

export const resendConfirmationAction = actionClient
  .metadata({ actionName: "resendConfirmation" })
  .inputSchema(emailOnlySchema)
  .action(async ({ parsedInput: { email } }) => {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });

    const code = authErrorCode(error);
    if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
      returnServerError(RATE_LIMITED);
    }
    if (error) throw error;

    return { email };
  });

/**
 * Emails a password-reset link. Always reports success, whether or not the
 * email has an account, so this form can't be used to enumerate users.
 */
export const requestPasswordResetAction = actionClient
  .metadata({ actionName: "requestPasswordReset" })
  .inputSchema(emailOnlySchema)
  .action(async ({ parsedInput: { email } }) => {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    const code = authErrorCode(error);
    if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
      returnServerError(RATE_LIMITED);
    }
    if (error) throw error;

    return { email };
  });

/**
 * Sets a new password. The user arrives here signed in by the one-time link in
 * the reset email (verified in /auth/confirm), so this requires a session.
 */
export const updatePasswordAction = authActionClient
  .metadata({ actionName: "updatePassword" })
  .inputSchema(resetPasswordSchema)
  .action(async ({ parsedInput: { password } }) => {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      switch (authErrorCode(error)) {
        case "same_password":
          returnValidationErrors(resetPasswordSchema, {
            password: { _errors: ["Choose a password you haven't used before"] },
          });
        case "weak_password":
          returnValidationErrors(resetPasswordSchema, {
            password: { _errors: ["That password is too weak. Try a longer one."] },
          });
        case "reauthentication_needed":
          returnServerError("For your security, request a new reset link and try again.");
        default:
          throw error;
      }
    }

    revalidatePath("/", "layout");
    return { updated: true };
  });
