import { env } from "@/lib/env";

import { DemoLoginButton } from "./demo-login-button";

/**
 * Server Component: only offers the demo account when it's configured.
 * The env check happens on the server, so the credentials never ship to the client.
 */
export function DemoLogin() {
  if (!env.DEMO_USER_EMAIL || !env.DEMO_USER_PASSWORD) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <DemoLoginButton />
    </div>
  );
}
