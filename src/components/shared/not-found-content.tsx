import { House } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/** The 404 message and a way home (inside or outside the app shell). */
export function NotFoundContent() {
  return (
    <>
      <div className="space-y-3">
        <p className="bg-brand bg-clip-text font-heading text-8xl font-extrabold text-transparent">
          404
        </p>
        <h1 className="text-3xl font-bold">This page took a day off</h1>
        <p className="max-w-sm text-muted-foreground">
          The link may be broken, or the page may have been removed.
        </p>
      </div>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        <House aria-hidden data-icon="inline-start" />
        Back to home
      </Link>
    </>
  );
}
