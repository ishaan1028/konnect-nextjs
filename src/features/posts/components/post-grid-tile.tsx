import { Heart, MessageCircle } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { formatCount } from "@/lib/format";
import { postImageUrl } from "@/lib/storage";
import { thumbhashPlaceholder } from "@/lib/thumbhash";

import type { PostThumbnail } from "../queries";

type PostGridTileProps = {
  post: PostThumbnail;
  /** Whose photo it is, for the alt text when the author didn't write one. */
  authorUsername: string;
  /** Like and comment counts, revealed on hover (Explore). */
  counts?: { likes: number; comments: number };
  /** In the first row (above the fold): load eagerly, it may be the page's largest paint. */
  priority?: boolean;
};

/**
 * A square photo tile linking to the post (it opens as a modal over the grid).
 * Used by profile grids and Explore.
 */
export function PostGridTile({
  post,
  authorUsername,
  counts,
  priority = false,
}: PostGridTileProps) {
  return (
    <Link
      href={`/p/${post.id}` as Route}
      className="group relative block aspect-square overflow-hidden rounded-lg bg-muted focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <Image
        src={postImageUrl(post.imagePath)}
        // The link's name: what the photo shows, or at least whose it is.
        alt={post.altText || `Photo by @${authorUsername}`}
        fill
        // Three columns of a ≤56rem page; a third of the screen on phones.
        sizes="(min-width: 56rem) 19rem, 33vw"
        placeholder={thumbhashPlaceholder(post.thumbhash)}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
      />
      {counts && (
        // Decorative: the same counts are on the post itself.
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center gap-5 bg-black/45 font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <span className="flex items-center gap-1.5">
            <Heart className="size-5 fill-current" />
            {formatCount(counts.likes)}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="size-5 fill-current" />
            {formatCount(counts.comments)}
          </span>
        </div>
      )}
    </Link>
  );
}
