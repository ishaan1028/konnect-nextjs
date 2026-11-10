import { env } from "@/lib/env";

import { DemoLoginButton } from "./demo-login-button";
import { OAuthButtons } from "./oauth-buttons";

/**
 * Server Component: Google, GitHub and (with `demo`) the demo account, below
 * the email form. The demo is offered only when it's configured; the env check
 * happens on the server, so the credentials never ship to the client.
 */
export function LoginOptions({ demo = false }: { demo?: boolean }) {
  const showDemo = demo && Boolean(env.DEMO_USER_EMAIL && env.DEMO_USER_PASSWORD);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-3">
        <OAuthButtons />
        {showDemo && <DemoLoginButton />}
      </div>
    </div>
  );
}
