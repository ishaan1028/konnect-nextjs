import { Skeleton } from "@/components/ui/skeleton";

import { PROFILE_POSTS_PAGE_SIZE } from "../queries";

/**
 * Exactly the space the first page of the grid will take: the profile's
 * (cached) post count says how many tiles to draw, so nothing below shifts
 * when the photos arrive. With no posts, it matches the empty state's height.
 */
export function ProfilePostsSkeleton({ count }: { count: number }) {
  if (count === 0) return <div aria-hidden className="min-h-72" />;

  return (
    <ul aria-hidden className="grid grid-cols-3 gap-1 sm:gap-1.5">
      {Array.from({ length: Math.min(count, PROFILE_POSTS_PAGE_SIZE) }, (_, index) => (
        <li key={index}>
          <Skeleton className="aspect-square rounded-lg" />
        </li>
      ))}
    </ul>
  );
}
