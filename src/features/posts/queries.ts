import type { SupabaseClient } from "@supabase/supabase-js";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import type { PersonSummary } from "@/features/follows/queries";
import { queryKeys } from "@/lib/query/keys";
import type { Database } from "@/types/database.types";

import { POST_DETAIL_COLUMNS, type PostDetail, toPostDetail } from "./post-detail";
import { postIdSchema } from "./schemas";

type Supabase = SupabaseClient<Database>;

/** A post as a grid tile: the photo and what's needed to lay it out. */
export type PostThumbnail = {
  id: string;
  imagePath: string;
  width: number;
  height: number;
  thumbhash: string | null;
  altText: string;
  createdAt: string;
};

export type PostThumbnailPage = {
  items: PostThumbnail[];
  nextCursor: { createdAt: string; id: string } | null;
};

/** Divisible by 3, so full pages fill whole rows of the grid. */
export const PROFILE_POSTS_PAGE_SIZE = 24;

/** A profile's posts, newest first, a page at a time (keyset pagination). */
export const profilePostsQueryOptions = (supabase: Supabase, profileId: string) =>
  infiniteQueryOptions({
    queryKey: queryKeys.posts.byAuthor(profileId),
    queryFn: async ({ pageParam }): Promise<PostThumbnailPage> => {
      const { data, error } = await supabase.rpc("get_profile_posts", {
        profile_id: profileId,
        cursor_created_at: pageParam?.createdAt,
        cursor_id: pageParam?.id,
        max_results: PROFILE_POSTS_PAGE_SIZE,
      });
      if (error) throw error;

      const items = data.map((row) => ({
        id: row.id,
        imagePath: row.image_path,
        width: row.image_width,
        height: row.image_height,
        // Function return types don't carry nullability; normalize explicitly.
        thumbhash: row.thumbhash ?? null,
        altText: row.alt_text,
        createdAt: row.created_at,
      }));
      const last = items.at(-1);

      return {
        items,
        nextCursor:
          items.length === PROFILE_POSTS_PAGE_SIZE && last
            ? { createdAt: last.createdAt, id: last.id }
            : null,
      };
    },
    initialPageParam: null as PostThumbnailPage["nextCursor"],
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

/** Keyset cursor shared by every newest-first list of posts. */
type PostCursor = { createdAt: string; id: string } | null;

const nextCursor = <T extends { id: string; createdAt: string }>(items: T[], pageSize: number) => {
  const last = items.at(-1);
  return items.length === pageSize && last ? { createdAt: last.createdAt, id: last.id } : null;
};

// -----------------------------------------------------------------------------
// Home feed
// -----------------------------------------------------------------------------

export type LikeStatus = { liked: boolean; count: number };

/** A post as a feed card: the photo, its author and the viewer's like. */
export type FeedPost = PostDetail & { likes: LikeStatus; commentsCount: number };

export type FeedPage = { items: FeedPost[]; nextCursor: PostCursor };

export const FEED_PAGE_SIZE = 10;

/** Your posts and the posts of people you follow, newest first. */
export const feedQueryOptions = (supabase: Supabase) =>
  infiniteQueryOptions({
    queryKey: queryKeys.posts.feed(),
    queryFn: async ({ pageParam }): Promise<FeedPage> => {
      const { data, error } = await supabase.rpc("get_feed", {
        cursor_created_at: pageParam?.createdAt,
        cursor_id: pageParam?.id,
        max_results: FEED_PAGE_SIZE,
      });
      if (error) throw error;

      const items = data.map((row) => ({
        id: row.id,
        imagePath: row.image_path,
        width: row.image_width,
        height: row.image_height,
        thumbhash: row.thumbhash ?? null,
        altText: row.alt_text,
        caption: row.caption,
        location: row.location,
        createdAt: row.created_at,
        commentsCount: row.comments_count,
        likes: { liked: row.liked_by_viewer, count: row.likes_count },
        author: {
          id: row.author_id,
          username: row.author_username,
          fullName: row.author_full_name,
          avatarPath: row.author_avatar_path ?? null,
        },
      }));
      return { items, nextCursor: nextCursor(items, FEED_PAGE_SIZE) };
    },
    initialPageParam: null as PostCursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

// -----------------------------------------------------------------------------
// Explore
// -----------------------------------------------------------------------------

export type ExplorePost = PostThumbnail & {
  likesCount: number;
  commentsCount: number;
  authorUsername: string;
};

export type ExplorePage = { items: ExplorePost[]; nextCursor: PostCursor };

/** Everyone else's posts, newest first, as grid tiles with their counts. */
export const exploreQueryOptions = (supabase: Supabase) =>
  infiniteQueryOptions({
    queryKey: queryKeys.posts.explore(),
    queryFn: async ({ pageParam }): Promise<ExplorePage> => {
      const { data, error } = await supabase.rpc("get_explore_posts", {
        cursor_created_at: pageParam?.createdAt,
        cursor_id: pageParam?.id,
        max_results: PROFILE_POSTS_PAGE_SIZE,
      });
      if (error) throw error;

      const items = data.map((row) => ({
        id: row.id,
        imagePath: row.image_path,
        width: row.image_width,
        height: row.image_height,
        thumbhash: row.thumbhash ?? null,
        altText: row.alt_text,
        createdAt: row.created_at,
        likesCount: row.likes_count,
        commentsCount: row.comments_count,
        authorUsername: row.author_username,
      }));
      return { items, nextCursor: nextCursor(items, PROFILE_POSTS_PAGE_SIZE) };
    },
    initialPageParam: null as PostCursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

// -----------------------------------------------------------------------------
// One post (the modal reads it in the browser) and its likes
// -----------------------------------------------------------------------------

export const postQueryOptions = (supabase: Supabase, postId: string) =>
  queryOptions({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: async (): Promise<PostDetail | null> => {
      // Not a UUID? It can't be a post (and would be a database error otherwise).
      if (!postIdSchema.safeParse(postId).success) return null;
      const { data, error } = await supabase
        .from("posts")
        .select(POST_DETAIL_COLUMNS)
        .eq("id", postId)
        .maybeSingle();
      if (error) throw error;
      return data ? toPostDetail(data) : null;
    },
  });

/** The viewer's like and the post's like count, shared by every Like button. */
export const likeStatusQueryOptions = (supabase: Supabase, postId: string) =>
  queryOptions({
    queryKey: queryKeys.likes.status(postId),
    queryFn: async (): Promise<LikeStatus> => {
      const { data, error } = await supabase.rpc("get_like_status", { post_id: postId }).single();
      if (error) throw error;
      return { liked: data.liked, count: data.likes_count };
    },
    // Feed cards seed this from their page, so a whole feed doesn't fire one
    // request per card; refresh at most once a minute (and after any toggle).
    staleTime: 60 * 1000,
  });

export type Liker = PersonSummary & {
  likedAt: string;
  viewerFollows: boolean;
  followsViewer: boolean;
};

export type LikersPage = { items: Liker[]; nextCursor: { likedAt: string; id: string } | null };

const LIKERS_PAGE_SIZE = 20;

/** Who liked a post, newest first. */
export const likersQueryOptions = (supabase: Supabase, postId: string) =>
  infiniteQueryOptions({
    queryKey: queryKeys.likes.likers(postId),
    queryFn: async ({ pageParam }): Promise<LikersPage> => {
      const { data, error } = await supabase.rpc("get_post_likers", {
        post_id: postId,
        cursor_liked_at: pageParam?.likedAt,
        cursor_id: pageParam?.id,
        max_results: LIKERS_PAGE_SIZE,
      });
      if (error) throw error;

      const items = data.map((row) => ({
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        avatarPath: row.avatar_path ?? null,
        likedAt: row.liked_at,
        viewerFollows: row.viewer_follows,
        followsViewer: row.follows_viewer,
      }));
      const last = items.at(-1);
      return {
        items,
        nextCursor:
          items.length === LIKERS_PAGE_SIZE && last ? { likedAt: last.likedAt, id: last.id } : null,
      };
    },
    initialPageParam: null as LikersPage["nextCursor"],
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
