import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoadErrorBoundary } from "@/components/shared/load-error-boundary";
import { buttonVariants } from "@/components/ui/button";
import { usernameFromSegment } from "@/features/profiles/username-segment";

import type { FollowListKind } from "../queries";
import { FollowListSkeleton } from "./follow-list";
import { FollowListLoader } from "./follow-list-loader";

type Params = Promise<{ username: string }>;

const labels = {
  followers: { title: "Followers", what: "followers" },
  following: { title: "Following", what: "who they follow" },
} satisfies Record<FollowListKind, { title: string; what: string }>;

export async function followListMetadata(params: Params, kind: FollowListKind): Promise<Metadata> {
  return { title: `${labels[kind].title} · @${usernameFromSegment((await params).username)}` };
}

/** The full-page followers/following list, for direct visits, refreshes and shared links. */
export function FollowListPage({ params, kind }: { params: Params; kind: FollowListKind }) {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Suspense fallback={<span className="size-9" />}>
          <BackToProfile params={params} />
        </Suspense>
        <h1 className="text-2xl font-bold">{labels[kind].title}</h1>
      </div>
      <LoadErrorBoundary what={labels[kind].what}>
        <Suspense fallback={<FollowListSkeleton />}>
          <FollowListLoader params={params} kind={kind} />
        </Suspense>
      </LoadErrorBoundary>
    </div>
  );
}

async function BackToProfile({ params }: { params: Params }) {
  const username = usernameFromSegment((await params).username);
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
