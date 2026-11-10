import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback?code=…&next=/path
 *
 * Google and GitHub send people back here (via Supabase Auth) after they
 * approve. exchangeCodeForSession() swaps the one-time code for a session,
 * using the PKCE verifier cookie set by oauthSignInAction, then we go to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(safeNextPath(searchParams.get("next")));
  }

  // Cancelled on the provider's screen (?error=access_denied), an expired or
  // reused code, or a missing verifier cookie (started in another browser).
  redirect("/login?error=oauth");
}
