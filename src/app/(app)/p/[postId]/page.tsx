import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PostOwnerMenu } from "@/features/posts/components/post-owner-menu";
import { PostView, PostViewSkeleton } from "@/features/posts/components/post-view";
import { getPost } from "@/features/posts/server/get-post";
import { CurrentUserBoundary } from "@/features/profiles/components/current-user-boundary";
import { postImageUrl } from "@/lib/storage";

/** The first line of the caption, trimmed for titles and link previews. */
const excerpt = (caption: string, max = 80) => {
  const line = caption.split("\n")[0]!.trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
};

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

export default function PostPage({ params }: PageProps<"/p/[postId]">) {
  return (
    <Suspense fallback={<PostViewSkeleton />}>
      <Post params={params} />
    </Suspense>
  );
}

async function Post({ params }: Pick<PageProps<"/p/[postId]">, "params">) {
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
      />
    </>
  );
}
