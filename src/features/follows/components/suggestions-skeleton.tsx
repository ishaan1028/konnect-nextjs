import { Skeleton } from "@/components/ui/skeleton";

// Kept in its own dependency-free file: the (static) home page imports only
// this placeholder, not the client-side follow feature behind it.
// Rows match PersonRow's size and the 5 suggestions loaded, so the real list
// replaces it without a shift.
export function SuggestionsSkeleton() {
  return (
    <ul aria-hidden>
      {[0, 1, 2, 3, 4].map((row) => (
        <li key={row} className="flex items-center gap-3 py-2">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
