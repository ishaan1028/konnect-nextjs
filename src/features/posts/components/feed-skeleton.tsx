import { Skeleton } from "@/components/ui/skeleton";

// Dependency-free, so the (static) home page imports only this placeholder.
// One card's shape: header, a 4:5 photo (the most common), actions.
export function FeedSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-4xl border bg-card">
      <div className="flex items-center gap-3 p-4">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-4 w-36" />
      </div>
      <Skeleton className="aspect-[4/5] rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
