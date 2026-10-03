"use client";

import { useEffect } from "react";

import { ThemeSync } from "@/components/theme/theme-sync";

import "./globals.css";

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * whole document, so it renders its own <html>/<body>, imports the global
 * styles, and re-applies the saved theme (the root layout's script isn't here).
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-dvh items-center justify-center bg-background p-6 font-sans text-foreground">
        <ThemeSync />
        <title>Something went wrong · Konnect</title>
        <main className="max-w-sm space-y-4 text-center">
          <h1 className="text-3xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">
            Konnect hit an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
