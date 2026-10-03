"use client";

import { useAction } from "next-safe-action/hooks";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { resendConfirmationAction } from "../actions";

/** "Didn't get it? Resend" for unconfirmed accounts. */
export function ResendConfirmation({ email }: { email: string }) {
  const { execute, isPending, hasSucceeded, result } = useAction(resendConfirmationAction);

  return (
    <div className="flex flex-col items-start gap-2 text-sm">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending || hasSucceeded}
        onClick={() => execute({ email })}
      >
        {isPending && <Spinner aria-hidden data-icon="inline-start" />}
        {hasSucceeded ? "Email sent" : "Resend confirmation email"}
      </Button>
      <p aria-live="polite" className="text-muted-foreground">
        {hasSucceeded && "Sent! It can take a minute to arrive."}
        {result.serverError}
      </p>
    </div>
  );
}
