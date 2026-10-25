import { ImagePlus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrentUserBoundary } from "@/features/profiles/components/current-user-boundary";
import { cn } from "@/lib/utils";

import { ComposerAvatar, ComposerGreeting } from "./composer-greeting";

/**
 * "What's new, Alex?" above the feed: a shortcut to Create. The bar is in the
 * static shell; only the avatar and name stream in, in the same space.
 */
export function ComposerBar() {
  return (
    <div className="flex items-center gap-3 rounded-3xl border bg-card p-3">
      <Suspense fallback={<Skeleton className="size-10 shrink-0 rounded-full" />}>
        <CurrentUserBoundary>
          <ComposerAvatar />
        </CurrentUserBoundary>
      </Suspense>
      <Link
        href="/create"
        className="min-w-0 flex-1 truncate rounded-full border bg-background px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <Suspense fallback="What's new?">
          <CurrentUserBoundary>
            <ComposerGreeting />
          </CurrentUserBoundary>
        </Suspense>
      </Link>
      <Link href="/create" className={cn(buttonVariants({ variant: "ghost" }), "shrink-0")}>
        {/* Accent on the icon only: accent text fails contrast on dark cards. */}
        <ImagePlus aria-hidden data-icon="inline-start" className="text-primary" />
        Photo
      </Link>
    </div>
  );
}
