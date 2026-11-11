import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LoadErrorBoundary } from "@/components/shared/load-error-boundary";
import { CommentForm, CommentFormSkeleton } from "@/features/comments/components/comment-form";
import {
  CommentThread,
  CommentThreadSkeleton,
} from "@/features/comments/components/comment-thread";
import { ViewerCommentsBoundary } from "@/features/comments/components/viewer-comments-boundary";
import { PostActions, PostActionsSkeleton } from "@/features/posts/components/post-actions";
import { PostOwnerMenu } from "@/features/posts/components/post-owner-menu";
import { PostView } from "@/features/posts/components/post-view";
import { ViewerLikeBoundary } from "@/features/posts/components/viewer-like-boundary";
import { getPost } from "@/features/posts/server/get-post";
import { CurrentUserBoundary } from "@/features/profiles/components/current-user-boundary";
import { postImageUrl } from "@/lib/storage";

/** The first line of the caption, trimmed for titles and link previews. */
const excerpt = (caption: string, max = 80) => {
  const line = caption.split("\n")[0]!.trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
};

/**
 * ISR for posts. Real post ids aren't known at build time (and the build never
 * talks to the database), so this lists one placeholder, which renders "not
 * found" without a query. A real post is rendered on its first visit and then
 * cached: its HTML arrives complete, photo included. The viewer's like, owner
 * menu and comments still stream (they read cookies).
 */
export function generateStaticParams() {
  return [{ postId: "__placeholder__" }];
}

/** Shares the cached post with the page, so both use one lookup. */
export async function generateMetadata({ params }: PageProps<"/p/[postId]">): Promise<Metadata> {
  const post = await getPost((await params).postId);
  if (!post) return { title: "Post not found" };

  const author = `${post.author.fullName} (@${post.author.username})`;
  const caption = excerpt(post.caption);
  const title = caption ? `${author}: “${caption}”` : `Photo by ${author}`;
  const description = caption || `A photo by ${author} on Konnect.`;
  const image = {
    url: postImageUrl(post.imagePath),
    width: post.width,
    height: post.height,
    alt: post.altText || `Photo by @${post.author.username}`,
  };

  return {
    title,
    description,
    alternates: { canonical: `/p/${post.id}` },
    openGraph: { title, description, type: "article", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/**
 * The post is awaited outside any <Suspense> on purpose: React streams a
 * finished boundary out of line (fallback first, swapped in by a script) once
 * the page above it passes ~12 KB, so a boundary here painted the skeleton
 * first and the photo, the page's LCP, a frame later. Without one, the cached
 * page paints the photo in its first frame. The cost: the very first visit to
 * a post waits for its render instead of showing a skeleton. In-app links open
 * the modal route instead, so only direct visits and refreshes land here.
 */
export const instant = false;

export default async function PostPage({ params }: PageProps<"/p/[postId]">) {
  const post = await getPost((await params).postId);
  if (!post) notFound();

  return (
    <>
      <h1 className="sr-only">Post by @{post.author.username}</h1>
      <PostView
        post={post}
        ownerMenu={
          // The post is public and cached; only "is it mine?" streams in.
          <Suspense fallback={null}>
            <CurrentUserBoundary>
              <PostOwnerMenu
                postId={post.id}
                authorId={post.author.id}
                details={{ caption: post.caption, altText: post.altText, location: post.location }}
              />
            </CurrentUserBoundary>
          </Suspense>
        }
        actions={
          <Suspense fallback={<PostActionsSkeleton />}>
            <ViewerLikeBoundary postId={post.id}>
              <PostActions
                postId={post.id}
                authorUsername={post.author.username}
                commentInputId={`comment-input-${post.id}`}
              />
            </ViewerLikeBoundary>
          </Suspense>
        }
        commentForm={
          <Suspense fallback={<CommentFormSkeleton />}>
            <CurrentUserBoundary>
              <CommentForm postId={post.id} inputId={`comment-input-${post.id}`} />
            </CurrentUserBoundary>
          </Suspense>
        }
        comments={
          <LoadErrorBoundary what="comments">
            <Suspense fallback={<CommentThreadSkeleton count={post.commentsCount} />}>
              <ViewerCommentsBoundary postId={post.id}>
                <CommentThread postId={post.id} />
              </ViewerCommentsBoundary>
            </Suspense>
          </LoadErrorBoundary>
        }
      />
    </>
  );
}
