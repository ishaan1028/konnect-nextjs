import type { Route } from "next";
import Link from "next/link";

import type { FeedComment } from "@/features/posts/queries";
import { pluralize } from "@/lib/format";

type LatestCommentsProps = {
  postId: string;
  comments: FeedComment[];
  /** All of the post's comments, for "View all N comments". */
  total: number;
};

/** Under a feed card: "View all N comments" and the latest two. */
export function LatestComments({ postId, comments, total }: LatestCommentsProps) {
  if (total === 0) return null;

  return (
    <div className="space-y-1 text-sm">
      {total > comments.length && (
        <Link
          href={`/p/${postId}` as Route}
          className="block text-muted-foreground hover:text-foreground"
        >
          View all {total.toLocaleString("en")} {pluralize(total, "comment", "comments")}
        </Link>
      )}
      <ul className="space-y-0.5">
        {comments.map((comment) => (
          <li key={comment.id} className="line-clamp-2 break-words">
            <Link
              href={`/${comment.authorUsername}` as Route}
              className="mr-1.5 font-semibold hover:underline"
            >
              {comment.authorUsername}
            </Link>
            {comment.body}
          </li>
        ))}
      </ul>
    </div>
  );
}
