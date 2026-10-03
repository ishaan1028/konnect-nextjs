import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Form-level error (e.g. "Incorrect email or password").
 * role="alert" makes screen readers announce it as soon as it appears.
 */
export function FormAlert({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <Alert variant="destructive" role="alert">
      <CircleAlert aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
