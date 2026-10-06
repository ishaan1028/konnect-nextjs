import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { avatarUrl, postImageUrl } from "@/lib/storage";
import { thumbhashPlaceholder } from "@/lib/thumbhash";

import type { PostDetail } from "../server/get-post";

type PostViewProps = {
  post: PostDetail;
  /** The author's Edit/Delete menu, streamed in separately (it's personal). */
  ownerMenu?: ReactNode;
};

/**
 * A post: author, photo, caption and date. Public and identical for every
 * visitor, so it renders on the server from the cached post.
 *
 * Phones: header, photo, caption stacked (Instagram's order). Wider screens:
 * photo on the left, everything else in a column on the right.
 */
export function PostView({ post, ownerMenu }: PostViewProps) {
  const profileHref = `/${post.author.username}` as Route;

  return (
    <article
      aria-label={`Post by @${post.author.username}`}
      className="mx-auto grid max-w-5xl overflow-hidden rounded-4xl border bg-card md:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)] md:grid-rows-[auto_1fr]"
    >
      <header className="flex items-center gap-3 border-b p-4 md:col-start-2">
        <Link href={profileHref} className="shrink-0 rounded-full" tabIndex={-1} aria-hidden>
          <UserAvatar
            name={post.author.fullName}
            src={avatarUrl(post.author.avatarPath)}
            pixelSize={40}
            className="size-10"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={profileHref} className="block truncate text-sm font-semibold hover:underline">
            {post.author.username}
          </Link>
          {post.location && (
            <p className="truncate text-sm text-muted-foreground">{post.location}</p>
          )}
        </div>
        {ownerMenu}
      </header>

      {/* Width and height are known, so the browser reserves the exact space
          (no layout shift); the ThumbHash preview fills it until it loads. */}
      <div className="bg-muted md:col-start-1 md:row-span-2 md:row-start-1 md:self-center">
        <Image
          src={postImageUrl(post.imagePath)}
          alt={post.altText || `Photo by @${post.author.username}`}
          width={post.width}
          height={post.height}
          // The page's main image (its LCP): start loading it right away.
          preload
          sizes="(min-width: 64rem) 37rem, (min-width: 48rem) 60vw, 100vw"
          placeholder={thumbhashPlaceholder(post.thumbhash)}
          className="h-auto w-full"
        />
      </div>

      <div className="flex flex-col gap-3 p-4 md:col-start-2">
        {post.caption && (
          <p className="text-sm break-words whitespace-pre-line">
            <Link href={profileHref} className="mr-1.5 font-semibold hover:underline">
              {post.author.username}
            </Link>
            {post.caption}
          </p>
        )}
        <time dateTime={post.createdAt} className="text-xs text-muted-foreground uppercase">
          {formatDate(post.createdAt)}
        </time>
      </div>
    </article>
  );
}

/** The post's shape before it streams in (a 4:5 photo, the most common). */
export function PostViewSkeleton() {
  return (
    <div
      aria-hidden
      className="mx-auto grid max-w-5xl overflow-hidden rounded-4xl border bg-card md:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)] md:grid-rows-[auto_1fr]"
    >
      <div className="flex items-center gap-3 border-b p-4 md:col-start-2">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="aspect-[4/5] rounded-none md:col-start-1 md:row-span-2 md:row-start-1" />
      <div className="space-y-2 p-4 md:col-start-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
