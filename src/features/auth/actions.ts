"use server";

import { isAuthApiError } from "@supabase/supabase-js";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { returnServerError, returnValidationErrors } from "next-safe-action";

import { profileTag } from "@/features/profiles/server/get-public-profile";
import { safeNextPath } from "@/lib/auth/redirect";
import { env } from "@/lib/env";
import { actionClient, ownAccountActionClient } from "@/lib/safe-action";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  changePasswordSchema,
  emailOnlySchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

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

    const credentials = { email: env.DEMO_USER_EMAIL, password: env.DEMO_USER_PASSWORD };
    const supabase = await createClient();
    let { error } = await supabase.auth.signInWithPassword(credentials);
    // Whoever is signed in as the demo can change its password through
    // Supabase's Auth API (RLS can't block that): put it back and retry, so
    // the shared account repairs itself.
    if (authErrorCode(error) === "invalid_credentials") {
      await resetDemoPassword(credentials);
      ({ error } = await supabase.auth.signInWithPassword(credentials));
    }
    if (error) throw error;

    revalidatePath("/", "layout");
    redirect("/");
  });

/** Sets the demo account's password back to the one in the server env. */
async function resetDemoPassword({ email, password }: { email: string; password: string }) {
  const admin = createAdminClient();
  // shortcut: pages through all users (the Auth admin API can't look up by email); it only runs after the password was changed.
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const demo = data.users.find((user) => user.email === email);
    if (demo) {
      const { error: updateError } = await admin.auth.admin.updateUserById(demo.id, { password });
      if (updateError) throw updateError;
      return;
    }
    if (data.users.length < 1000) throw new Error("The demo account doesn't exist");
  }
}

export const signOutAction = actionClient.metadata({ actionName: "signOut" }).action(async () => {
  const supabase = await createClient();
  // This browser only (revokes its refresh token, clears the cookies): the
  // default "global" would also sign out everyone sharing the demo account.
  await supabase.auth.signOut({ scope: "local" });

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
export const updatePasswordAction = ownAccountActionClient
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

/**
 * Change your password from settings. The current password is checked first
 * (someone at an unlocked screen can't take over the account), which is also
 * the fresh sign-in Supabase requires before a password change.
 */
export const changePasswordAction = ownAccountActionClient
  .metadata({ actionName: "changePassword" })
  .inputSchema(changePasswordSchema)
  .action(async ({ parsedInput: { currentPassword, password }, ctx: { user } }) => {
    const supabase = await createClient();
    const { error: checkError } = await supabase.auth.signInWithPassword({
      email: user.email ?? "",
      password: currentPassword,
    });
    if (checkError) {
      switch (authErrorCode(checkError)) {
        case "invalid_credentials":
          returnValidationErrors(changePasswordSchema, {
            currentPassword: { _errors: ["That's not your current password"] },
          });
        case "over_request_rate_limit":
          returnServerError(RATE_LIMITED);
        default:
          throw checkError;
      }
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      if (authErrorCode(error) === "weak_password") {
        returnValidationErrors(changePasswordSchema, {
          password: { _errors: ["That password is too weak. Try a longer one."] },
        });
      }
      throw error;
    }
    return { updated: true };
  });
