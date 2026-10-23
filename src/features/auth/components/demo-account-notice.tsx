import { Lock } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DEMO_READ_ONLY_MESSAGE } from "@/lib/auth/demo";

/** Tells the shared demo account why settings are disabled, with a way out. */
export function DemoAccountNotice({ message = DEMO_READ_ONLY_MESSAGE }: { message?: string }) {
  return (
    <Alert>
      <Lock aria-hidden />
      <AlertTitle>This is the shared demo account</AlertTitle>
      <AlertDescription>
        <p>
          {message}{" "}
          <Link href="/signup" className="font-medium text-foreground underline">
            Sign up
          </Link>
        </p>
      </AlertDescription>
    </Alert>
  );
}
