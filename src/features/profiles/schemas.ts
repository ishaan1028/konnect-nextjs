import { z } from "zod";

import { fullNameSchema, usernameSchema } from "@/features/auth/schemas";

export const BIO_MAX_LENGTH = 150;

export const updateProfileSchema = z.object({
  fullName: fullNameSchema,
  username: usernameSchema,
  bio: z.string().trim().max(BIO_MAX_LENGTH, `Use ${BIO_MAX_LENGTH} characters or fewer`),
});

/**
 * Avatars are uploaded by the browser straight to Storage as
 * <user id>/<random uuid>.<ext>; the Server Action receives only that path.
 * The action also checks the path belongs to the caller and the file exists.
 */
export const avatarPathSchema = z.object({
  path: z
    .string()
    .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg|png)$/, { error: "Invalid avatar path" }),
});

export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
