"use server";

import { postTargetSchema } from "@/features/posts/schemas";
import { authActionClient } from "@/lib/safe-action";
import { createClient } from "@/lib/supabase/server";

const UNIQUE_VIOLATION = "23505";

/** Save a post to your private list (saving it twice is a no-op). */
export const savePostAction = authActionClient
  .metadata({ actionName: "savePost" })
  .inputSchema(postTargetSchema)
  .action(async ({ parsedInput: { postId }, ctx: { user } }) => {
    const supabase = await createClient();
    // user_id comes from the verified session, never from the client.
    const { error } = await supabase
      .from("saved_posts")
      .insert({ post_id: postId, user_id: user.id });
    if (error && error.code !== UNIQUE_VIOLATION) throw error;
    return { saved: true };
  });

export const unsavePostAction = authActionClient
  .metadata({ actionName: "unsavePost" })
  .inputSchema(postTargetSchema)
  .action(async ({ parsedInput: { postId }, ctx: { user } }) => {
    const supabase = await createClient();
    const { error } = await supabase
      .from("saved_posts")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) throw error;
    return { saved: false };
  });
