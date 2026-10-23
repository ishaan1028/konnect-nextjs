import { Button } from "@/components/ui/button";

/** A failed load with a retry: under an infinite list whose next page failed, or in its place. */
export function LoadMoreError({
  message = "Couldn't load more.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="flex items-center justify-center gap-3 py-4 text-sm">
      {message}
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
