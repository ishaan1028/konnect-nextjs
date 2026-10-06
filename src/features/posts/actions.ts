"use server";

import { updateTag } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { returnServerError } from "next-safe-action";

import { profileTag } from "@/features/profiles/server/get-public-profile";
import { authActionClient } from "@/lib/safe-action";
import { POSTS_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

import { createPostSchema, deletePostSchema, postDetailsSchema, postIdSchema } from "./schemas";
import { postTag } from "./server/get-post";

/**
 * Publish a photo the browser already uploaded (straight to Storage, into the
 * user's own folder). The server receives only the path, so it verifies it
 * before trusting it: it must be the caller's, and the file must exist.
 * Then it opens the new post, replacing /create in the history.
 */
export const createPostAction = authActionClient
  .metadata({ actionName: "createPost" })
  .inputSchema(createPostSchema)
  .action(async ({ parsedInput: input, ctx: { user } }) => {
    if (!input.path.startsWith(`${user.id}/`)) {
      returnServerError("You can only post your own uploads.");
    }

    const supabase = await createClient();
    const bucket = supabase.storage.from(POSTS_BUCKET);

    const { data: exists } = await bucket.exists(input.path);
    if (!exists) returnServerError("Upload not found. Please try again.");

    // author_id comes from the verified session, never from the client.
    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        author_id: user.id,
        image_path: input.path,
        image_width: input.width,
        image_height: input.height,
        thumbhash: input.thumbhash,
        alt_text: input.altText,
        caption: input.caption,
        location: input.location,
      })
      .select("id, author:profiles!inner(username)")
      .single();

    if (error) {
      // Don't leave an orphaned file behind (best effort).
      await bucket.remove([input.path]);
      throw error;
    }

    // The cached profile shows the posts count.
    updateTag(profileTag(post.author.username));
    redirect(`/p/${post.id}`, RedirectType.replace);
  });

/**
 * Edit the caption, location and alt text. RLS and the column grants already
 * limit this to the author and to these three columns; filtering by
 * author_id too turns "not yours" into a clear message instead of a no-op.
 */
export const updatePostAction = authActionClient
  .metadata({ actionName: "updatePost" })
  .inputSchema(postDetailsSchema)
  .bindArgsSchemas([postIdSchema])
  .action(
    async ({
      parsedInput: { caption, altText, location },
      bindArgsParsedInputs: [postId],
      ctx: { user },
    }) => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("posts")
        .update({ caption, alt_text: altText, location })
        .eq("id", postId)
        .eq("author_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) returnServerError("You can only edit your own posts.");

      updateTag(postTag(postId));
      return { caption, altText, location };
    },
  );

/** Delete the post, then its photo, then go back to the author's profile. */
export const deletePostAction = authActionClient
  .metadata({ actionName: "deletePost" })
  .inputSchema(deletePostSchema)
  .action(async ({ parsedInput: { postId }, ctx: { user } }) => {
    const supabase = await createClient();

    const { data: post, error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("author_id", user.id)
      .select("image_path, author:profiles!inner(username)")
      .maybeSingle();

    if (error) throw error;
    if (!post) returnServerError("You can only delete your own posts.");

    // Files go through the Storage API (never SQL). An orphaned file is
    // harmless, so a failure here doesn't fail the request.
    const { error: removeError } = await supabase.storage
      .from(POSTS_BUCKET)
      .remove([post.image_path]);
    if (removeError) console.error("[action:deletePost] file cleanup", removeError);

    updateTag(postTag(postId));
    updateTag(profileTag(post.author.username));
    // Redirect from the server: re-rendering the deleted post's page first
    // would flash a "not found" before the client could navigate away.
    redirect(`/${post.author.username}`, RedirectType.replace);
  });
