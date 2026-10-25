import type { Route } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PostGridTile } from "@/features/posts/components/post-grid-tile";
import { getPopularPosts } from "@/features/posts/server/get-popular-posts";
import { requireUser } from "@/lib/dal";
import { formatCount, pluralize } from "@/lib/format";
import { avatarUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

/**
 * Who you are at a glance: avatar, name and your counts, each linking to the
 * list behind it. Rendered per request (your own, always current data).
 */
export async function ProfileSummary() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_path, posts_count, followers_count, following_count")
    .eq("id", user.id)
    .single()
    .throwOnError();

  const stats = [
    {
      count: profile.posts_count,
      label: pluralize(profile.posts_count, "post", "posts"),
      href: `/${profile.username}`,
    },
    {
      count: profile.followers_count,
      label: pluralize(profile.followers_count, "follower", "followers"),
      href: `/${profile.username}/followers`,
    },
    { count: profile.following_count, label: "following", href: `/${profile.username}/following` },
  ];

  return (
    <div className="rounded-3xl border bg-card p-4">
      <Link
        href={`/${profile.username}` as Route}
        className="flex items-center gap-3 rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <UserAvatar
          name={profile.full_name || profile.username}
          src={avatarUrl(profile.avatar_path)}
          pixelSize={56}
          className="size-14"
        />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{profile.username}</span>
          <span className="block truncate text-sm text-muted-foreground">{profile.full_name}</span>
        </span>
      </Link>
      <Separator className="my-3" />
      <ul className="grid grid-cols-3 gap-2 text-center">
        {stats.map((stat) => (
          <li key={stat.label}>
            <Link
              href={stat.href as Route}
              className="block rounded-xl border py-1.5 transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              <span className="block font-semibold">{formatCount(stat.count)}</span>
              <span className="block text-xs text-muted-foreground">{stat.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProfileSummarySkeleton() {
  return (
    <div aria-hidden className="rounded-3xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Separator className="my-3" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((tile) => (
          <Skeleton key={tile} className="h-[3.375rem] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** The most-liked posts on Konnect, three across (counts on hover). */
export async function PopularPosts() {
  // Per request, from a shared cache: the build never needs the database.
  await connection();
  const posts = await getPopularPosts();
  if (posts.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No posts yet.</p>;
  }
  return (
    <ul className="grid grid-cols-3 gap-1.5">
      {posts.map((post) => (
        <li key={post.id}>
          <PostGridTile
            post={post}
            authorUsername={post.authorUsername}
            counts={{ likes: post.likesCount, comments: post.commentsCount }}
            sizes="6rem"
          />
        </li>
      ))}
    </ul>
  );
}

export function PopularPostsSkeleton() {
  return (
    <ul aria-hidden className="grid grid-cols-3 gap-1.5">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index}>
          <Skeleton className="aspect-square rounded-lg" />
        </li>
      ))}
    </ul>
  );
}
