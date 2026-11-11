import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { profileTag } from "@/features/profiles/server/get-public-profile";
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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // A first sign-in creates the profile: if anyone visited /<username>
      // before it existed, a cached "not found" could hide it (as in signUpAction).
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile) revalidateTag(profileTag(profile.username), { expire: 0 });
      redirect(safeNextPath(searchParams.get("next")));
    }
  }

  // Cancelled on the provider's screen (?error=access_denied), an expired or
  // reused code, or a missing verifier cookie (started in another browser).
  redirect("/login?error=oauth");
}
