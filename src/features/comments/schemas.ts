import { z } from "zod";

export const COMMENT_MAX_LENGTH = 500;

export const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Write something first")
  .max(COMMENT_MAX_LENGTH, `Use ${COMMENT_MAX_LENGTH} characters or fewer`);

export const addCommentSchema = z.object({ postId: z.uuid(), body: commentBodySchema });

export const deleteCommentSchema = z.object({ commentId: z.uuid() });
