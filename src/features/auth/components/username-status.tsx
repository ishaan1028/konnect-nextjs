import { CircleCheck, CircleX } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

import type { UsernameStatus as Status } from "./use-username-availability";

/** The hint under the username field. Announced politely by screen readers. */
export function UsernameStatus({ status }: { status: Status }) {
  return (
    <span aria-live="polite" className="flex min-h-5 items-center gap-1.5">
      {status.state === "idle" && "Letters, numbers, periods and underscores."}
      {status.state === "current" && "This is your current username."}
      {status.state === "checking" && (
        <>
          <Spinner aria-hidden className="size-3.5" />
          Checking availability…
        </>
      )}
      {status.state === "available" && (
        <span className="flex items-center gap-1.5 text-primary">
          <CircleCheck aria-hidden className="size-3.5" />@{status.username} is available
        </span>
      )}
      {status.state === "unavailable" && (
        <span className="flex items-center gap-1.5 text-destructive">
          <CircleX aria-hidden className="size-3.5" />@{status.username} isn&apos;t available
        </span>
      )}
      {status.state === "error" && "Couldn't check availability right now."}
    </span>
  );
}
