"use client";

import { Sparkles } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { demoSignInAction } from "../actions";

/**
 * Replaces the old app's pre-filled demo credentials: the password never
 * reaches the browser, because the Server Action reads it from server env.
 */
export function DemoLoginButton() {
  const { execute, isPending, result } = useAction(demoSignInAction);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={isPending}
        onClick={() => execute()}
      >
        {isPending ? (
          <Spinner aria-hidden data-icon="inline-start" />
        ) : (
          <Sparkles aria-hidden data-icon="inline-start" />
        )}
        Continue as demo user
      </Button>
      {result.serverError && (
        <p role="alert" className="text-sm text-destructive">
          {result.serverError}
        </p>
      )}
    </div>
  );
}
