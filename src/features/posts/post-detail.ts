/*
 * One post's full details, shared by the cached server read (get-post.ts) and
 * the browser query that fills the post modal, so both select and shape the
 * same columns.
 */

export type PostDetail = {
  id: string;
  imagePath: string;
  width: number;
  height: number;
  thumbhash: string | null;
  altText: string;
  caption: string;
  location: string;
  createdAt: string;
  author: { id: string; username: string; fullName: string; avatarPath: string | null };
};

export const POST_DETAIL_COLUMNS =
  "id, image_path, image_width, image_height, thumbhash, alt_text, caption, location, created_at, author:profiles!posts_author_id_fkey!inner(id, username, full_name, avatar_path)" as const;

type PostDetailRow = {
  id: string;
  image_path: string;
  image_width: number;
  image_height: number;
  thumbhash: string | null;
  alt_text: string;
  caption: string;
  location: string;
  created_at: string;
  author: { id: string; username: string; full_name: string; avatar_path: string | null };
};

export function toPostDetail(row: PostDetailRow): PostDetail {
  return {
    id: row.id,
    imagePath: row.image_path,
    width: row.image_width,
    height: row.image_height,
    thumbhash: row.thumbhash,
    altText: row.alt_text,
    caption: row.caption,
    location: row.location,
    createdAt: row.created_at,
    author: {
      id: row.author.id,
      username: row.author.username,
      fullName: row.author.full_name,
      avatarPath: row.author.avatar_path,
    },
  };
}
