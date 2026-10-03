import { House } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

// Rendered for any URL that matches no route, and whenever a page calls notFound().
export default function NotFound() {
  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center outline-none"
    >
      <Logo />
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
    </main>
  );
}
