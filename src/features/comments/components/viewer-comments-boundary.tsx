import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getServerQueryClient } from "@/lib/query/server";
import { createClient } from "@/lib/supabase/server";

import { commentsQueryOptions } from "../queries";

/**
 * Starts the first page of a post's comments without awaiting. Fetched as the
 * viewer (cookies), because each comment says whether *they* may delete it.
 * Render inside <Suspense fallback={<CommentThreadSkeleton />}>.
 */
export async function ViewerCommentsBoundary({
  postId,
  children,
}: {
  postId: string;
  children: ReactNode;
}) {
  const queryClient = getServerQueryClient();
  void queryClient.prefetchInfiniteQuery(commentsQueryOptions(await createClient(), postId));

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
