"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { RelativeTime } from "@/components/shared/relative-time";
import { UserAvatar } from "@/components/shared/user-avatar";
import { avatarUrl, postImageUrl } from "@/lib/storage";
import { thumbhashPlaceholder } from "@/lib/thumbhash";

import type { FeedPost } from "../queries";
import { DoubleTapLike } from "./double-tap-like";
import { PostActions } from "./post-actions";
import { PostCaption } from "./post-caption";

type PostCardProps = {
  post: FeedPost;
  /** The first card's photo is the page's largest paint: load it eagerly. */
  priority?: boolean;
};

/** A post in the home feed. Its photo, comment button and time open the post. */
export function PostCard({ post, priority = false }: PostCardProps) {
  const postHref = `/p/${post.id}` as Route;
  const profileHref = `/${post.author.username}` as Route;

  return (
    <article
      aria-label={`Post by @${post.author.username}`}
      className="overflow-hidden rounded-4xl border bg-card"
    >
      <header className="flex items-center gap-3 p-4">
        <Link href={profileHref} className="shrink-0 rounded-full" tabIndex={-1} aria-hidden>
          <UserAvatar
            name={post.author.fullName}
            src={avatarUrl(post.author.avatarPath)}
            pixelSize={40}
            className="size-10"
          />
        </Link>
        <div className="min-w-0 flex-1 text-sm">
          <p className="flex items-center gap-1.5">
            <Link href={profileHref} className="truncate font-semibold hover:underline">
              {post.author.username}
            </Link>
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
            <Link href={postHref} className="shrink-0 text-muted-foreground hover:underline">
              <RelativeTime date={post.createdAt} />
            </Link>
          </p>
          {post.location && <p className="truncate text-muted-foreground">{post.location}</p>}
        </div>
      </header>

      {/* Known width and height: the space is reserved before the photo loads. */}
      <DoubleTapLike postId={post.id}>
        <Image
          src={postImageUrl(post.imagePath)}
          alt={post.altText || `Photo by @${post.author.username}`}
          width={post.width}
          height={post.height}
          // The feed column is at most 36rem wide; full width on phones.
          sizes="(min-width: 40rem) 36rem, 100vw"
          placeholder={thumbhashPlaceholder(post.thumbhash)}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="h-auto w-full bg-muted"
        />
      </DoubleTapLike>

      <div className="space-y-2 p-4 pt-2">
        <PostActions
          postId={post.id}
          authorUsername={post.author.username}
          initial={post.likes}
          commentHref={postHref}
        />
        {post.caption && <PostCaption username={post.author.username} caption={post.caption} />}
      </div>
    </article>
  );
}
