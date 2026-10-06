import { z } from "zod";

export const CAPTION_MAX_LENGTH = 2200;
export const ALT_TEXT_MAX_LENGTH = 250;
export const LOCATION_MAX_LENGTH = 100;
/** Smallest photo width we accept (Instagram's minimum too). */
export const MIN_PHOTO_WIDTH = 320;

const maxLength = (max: number) => `Use ${max} characters or fewer`;

/** The text around a photo: written when posting, editable later. */
export const postDetailsSchema = z.object({
  caption: z.string().trim().max(CAPTION_MAX_LENGTH, maxLength(CAPTION_MAX_LENGTH)),
  altText: z.string().trim().max(ALT_TEXT_MAX_LENGTH, maxLength(ALT_TEXT_MAX_LENGTH)),
  location: z.string().trim().max(LOCATION_MAX_LENGTH, maxLength(LOCATION_MAX_LENGTH)),
});

/**
 * The browser uploads the photo straight to Storage as
 * <user id>/<random uuid>.<ext> and sends only that path plus the photo's
 * size and preview hash. The action also checks the path is the caller's and
 * the file exists; the database re-checks the folder and aspect ratio.
 */
export const createPostSchema = postDetailsSchema.extend({
  path: z
    .string()
    .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg)$/, { error: "Invalid photo path" }),
  width: z.int().min(MIN_PHOTO_WIDTH).max(2160),
  height: z.int().min(1).max(2700),
  thumbhash: z
    .string()
    .regex(/^[A-Za-z0-9+/]{1,64}={0,2}$/)
    .nullable(),
});

export const postIdSchema = z.uuid();

export const deletePostSchema = z.object({ postId: postIdSchema });

export type PostDetailsInput = z.input<typeof postDetailsSchema>;
export type CreatePostInput = z.input<typeof createPostSchema>;
