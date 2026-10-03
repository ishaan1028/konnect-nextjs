import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/** The link types our email templates send (see supabase/templates). */
const SUPPORTED_TYPES = new Set<EmailOtpType>(["email", "recovery", "email_change"]);

/**
 * GET /auth/confirm?token_hash=…&type=email|recovery&next=/path
 *
 * A Route Handler: plain HTTP, no UI. Confirmation and password-reset emails
 * link here. verifyOtp() exchanges the one-time token for a session (written to
 * cookies by the server client), then we redirect to `next`.
 *
 * The token is verified on our server rather than with an implicit-flow
 * redirect, so it never appears in client-side JS or the browser history.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNextPath(searchParams.get("next"));

  if (tokenHash && type && SUPPORTED_TYPES.has(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
  }

  // Expired, already used, or tampered with. Links are single-use, so a second
  // click (or an email scanner that pre-fetched it) lands here.
  redirect(
    type === "recovery" ? "/forgot-password?error=link-expired" : "/login?error=link-expired",
  );
}
