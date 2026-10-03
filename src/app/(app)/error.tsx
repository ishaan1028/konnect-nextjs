"use client"; // Error boundaries must be Client Components.

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * Catches errors thrown while rendering any page inside (app).
 * The layout above it (nav) stays on screen, so the user is never stranded.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Replaced by real error reporting (Sentry) in phase 14.
    console.error(error);
  }, [error]);

  return (
    <Empty className="mx-auto max-w-xl border">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <TriangleAlert aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="font-heading text-xl font-bold">Something went wrong</EmptyTitle>
        <EmptyDescription>
          {/* Server error messages are hidden in production; the digest links to server logs. */}
          We couldn&apos;t load this page. Please try again.
          {error.digest && (
            <span className="mt-2 block font-mono text-xs">Ref: {error.digest}</span>
          )}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        {/* retry() re-fetches and re-renders this segment (Next 16.3+). */}
        <Button onClick={() => retry()}>
          <RotateCcw aria-hidden data-icon="inline-start" />
          Try again
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Go home
        </Link>
      </EmptyContent>
    </Empty>
  );
}
