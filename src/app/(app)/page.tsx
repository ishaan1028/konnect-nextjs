import { Compass, ImagePlus, Images, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ComingSoon } from "@/components/shared/coming-soon";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Home",
};

// A Server Component: rendered at build time into the static shell, zero JS shipped.
export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-5xl gap-10">
      <section aria-labelledby="feed-heading" className="mx-auto w-full max-w-xl space-y-6">
        <h1 id="feed-heading" className="sr-only">
          Home feed
        </h1>

        <div className="relative overflow-hidden rounded-4xl bg-brand p-7 text-white shadow-xl shadow-primary/20">
          <div
            aria-hidden
            className="absolute -top-20 -right-16 size-64 rounded-full bg-brand-vivid opacity-80 blur-3xl"
          />
          <p className="relative text-sm font-medium text-white/80">Welcome to Konnect</p>
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

        <ComingSoon
          icon={Images}
          title="Your feed lives here"
          description="Posts from you and the people you follow, with likes, comments and infinite scroll."
          phase={9}
        />
      </section>

      <aside aria-labelledby="suggestions-heading" className="hidden w-80 shrink-0 xl:block">
        <Card className="sticky top-10">
          <CardHeader>
            <CardTitle id="suggestions-heading" className="flex items-center gap-2">
              <UsersRound aria-hidden className="size-4 text-primary" />
              Suggested for you
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3" aria-hidden>
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Follow suggestions arrive in phase 7.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
