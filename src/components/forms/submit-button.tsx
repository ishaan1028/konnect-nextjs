import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type SubmitButtonProps = ComponentProps<typeof Button> & {
  pending: boolean;
  pendingLabel: string;
};

/** Full-width submit button that shows progress and blocks double submits. */
export function SubmitButton({ pending, pendingLabel, children, ...props }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      size="lg"
      className="w-full"
      disabled={pending}
      aria-disabled={pending}
      {...props}
    >
      {pending ? (
        <>
          <Spinner aria-hidden data-icon="inline-start" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
