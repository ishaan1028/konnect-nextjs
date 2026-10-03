import { TriangleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

const MESSAGES: Record<string, string> = {
  "link-expired": "That link has expired or was already used. Links work once, for 1 hour.",
};

/**
 * Shows a notice when the confirm route sends someone back here with ?error=.
 *
 * It receives the searchParams *promise* and awaits it itself, so the page
 * renders it inside <Suspense>: only this small notice waits for the URL,
 * while the heading and form stay in the prerendered static shell.
 */
export async function AuthNotice({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? MESSAGES[error] : undefined;
  if (!message) return null;

  return (
    <Alert role="alert">
      <TriangleAlert aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
