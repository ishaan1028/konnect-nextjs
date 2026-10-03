import { Grid3x3 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Profile" };

/**
 * Not async: the page never awaits `params` itself. With Cache Components,
 * an unknown dynamic param is request-time data, so we read it inside a
 * <Suspense> boundary. Everything outside it is prerendered into the static
 * shell and served instantly; only <ProfileHandle> streams in.
 */
export default function ProfilePage({ params }: PageProps<"/[username]">) {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
        <div className="rounded-full bg-brand-vivid p-1">
          <div className="size-24 rounded-full border-4 border-background bg-muted sm:size-32" />
        </div>
        <div className="space-y-2 text-center sm:text-left">
          <Suspense fallback={<Skeleton className="h-9 w-40" />}>
            <ProfileHandle params={params} />
          </Suspense>
          <p className="text-muted-foreground">Bio, stats and the follow button arrive soon.</p>
        </div>
      </header>

      <ComingSoon
        icon={Grid3x3}
        title="Posts grid"
        description="Avatar upload, profile editing and every post this person has shared."
        phase={6}
      />
    </div>
  );
}

async function ProfileHandle({ params }: Pick<PageProps<"/[username]">, "params">) {
  const { username } = await params;
  return <h1 className="text-3xl font-bold">@{decodeURIComponent(username)}</h1>;
}
