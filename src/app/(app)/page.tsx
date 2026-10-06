import { Compass, ImagePlus, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuggestionsSkeleton } from "@/features/follows/components/suggestions-skeleton";
import { FeedBoundary } from "@/features/posts/components/feed-boundary";
import { FeedSkeleton } from "@/features/posts/components/feed-skeleton";
import { SuggestionsBoundary } from "@/features/follows/components/suggestions-boundary";
import { CurrentUserBoundary } from "@/features/profiles/components/current-user-boundary";
import { WelcomeGreeting } from "@/features/profiles/components/welcome-greeting";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Home",
};

// A Server Component: rendered at build time into the static shell, zero JS shipped.
export default function HomePage() {
  return (
    // One grid, one copy of each part: on xl the suggestions sit in a right
    // rail; below that they flow between the hero and the feed. Source order
    // (hero → suggestions → feed) is also the reading order.
    <div className="mx-auto grid max-w-xl gap-6 xl:max-w-5xl xl:grid-cols-[minmax(0,36rem)_20rem] xl:justify-center xl:gap-x-10">
      <h1 className="sr-only">Home feed</h1>

      <div className="relative overflow-hidden rounded-4xl bg-brand p-7 text-white shadow-xl shadow-primary/20">
        <div
          aria-hidden
          className="absolute -top-20 -right-16 size-64 rounded-full bg-brand-vivid opacity-80 blur-3xl"
        />
        <p className="relative text-sm font-medium text-white/80">
          {/* Partial Prerendering in one line: the hero is static, only the
                name streams in, and the fallback occupies the same space. */}
          <Suspense fallback="Welcome to Konnect">
            <CurrentUserBoundary>
              <WelcomeGreeting />
            </CurrentUserBoundary>
          </Suspense>
        </p>
        <h2 className="relative mt-1 text-4xl font-extrabold">Your people, your moments.</h2>
        <p className="relative mt-2 max-w-sm text-white/85">
          Share photos, follow friends and chat in real time.
        </p>
        <div className="relative mt-6 flex flex-wrap gap-2">
          <Link
            href="/create"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-white text-neutral-900 hover:bg-white/90",
            )}
          >
            <ImagePlus aria-hidden data-icon="inline-start" />
            New post
          </Link>
          <Link
            href="/explore"
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "text-white hover:bg-white/15 hover:text-white",
            )}
          >
            <Compass aria-hidden data-icon="inline-start" />
            Explore
          </Link>
        </div>
      </div>

      <aside
        aria-labelledby="suggestions-heading"
        className="xl:sticky xl:top-10 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-start"
      >
        <Card>
          <CardHeader>
            <CardTitle id="suggestions-heading" className="flex items-center gap-2">
              <UsersRound aria-hidden className="size-4 text-primary" />
              Suggested for you
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Fixed height (fits the 5 suggestions): the skeleton and the list
                fill the same box, so nothing shifts when they load; anything
                more scrolls inside. The side padding keeps focus rings from
                being clipped by the scroll area. */}
            <div className="-mx-1.5 h-75 overflow-y-auto px-1.5">
              <Suspense fallback={<SuggestionsSkeleton />}>
                <SuggestionsBoundary />
              </Suspense>
            </div>
          </CardContent>
        </Card>
      </aside>

      <section aria-label="Feed" className="xl:col-start-1">
        <Suspense fallback={<FeedSkeleton />}>
          <FeedBoundary />
        </Suspense>
      </section>
    </div>
  );
}
