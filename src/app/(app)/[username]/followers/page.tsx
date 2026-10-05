import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { FollowListSkeleton } from "@/features/follows/components/follow-list";
import { FollowListLoader } from "@/features/follows/components/follow-list-loader";

export async function generateMetadata({
  params,
}: PageProps<"/[username]/followers">): Promise<Metadata> {
  const { username } = await params;
  return { title: `Followers · @${decodeURIComponent(username).toLowerCase()}` };
}

/** The full-page version, for direct visits, refreshes and shared links. */
export default function FollowersPage({ params }: PageProps<"/[username]/followers">) {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Suspense fallback={<span className="size-9" />}>
          <BackToProfile params={params} />
        </Suspense>
        <h1 className="text-2xl font-bold">Followers</h1>
      </div>
      <Suspense fallback={<FollowListSkeleton />}>
        <FollowListLoader params={params} kind="followers" />
      </Suspense>
    </div>
  );
}

async function BackToProfile({ params }: Pick<PageProps<"/[username]/followers">, "params">) {
  const username = decodeURIComponent((await params).username).toLowerCase();
  return (
    <Link
      href={`/${username}` as Route}
      aria-label={`Back to @${username}`}
      className={buttonVariants({ variant: "ghost", size: "icon" })}
    >
      <ArrowLeft aria-hidden />
    </Link>
  );
}
