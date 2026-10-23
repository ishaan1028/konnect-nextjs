"use client";

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { catchError, type ErrorInfo } from "next/error";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LoadErrorProps = {
  /** What failed to load, e.g. "posts" → "Couldn't load posts." */
  what: string;
  className?: string;
};

function TryAgain({ retry }: { retry: () => void }) {
  const queryErrors = useQueryErrorResetBoundary();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        // Lets the failed queries fetch again, then re-renders (and refetches) the section.
        queryErrors.reset();
        retry();
      }}
    >
      <RotateCcw aria-hidden data-icon="inline-start" />
      Try again
    </Button>
  );
}

function LoadErrorFallback({ what, className }: LoadErrorProps, { retry }: ErrorInfo) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-6 text-center text-sm",
        className,
      )}
    >
      <TriangleAlert aria-hidden className="size-5 text-destructive" />
      <p>Couldn&apos;t load {what}.</p>
      <TryAgain retry={retry} />
    </div>
  );
}

/**
 * Wraps one section (a list, a thread) so a failed load shows "Couldn't load
 * … Try again" in place, instead of replacing the whole page with error.tsx.
 * Put it around the section's <Suspense>.
 */
export const LoadErrorBoundary = catchError(LoadErrorFallback);
