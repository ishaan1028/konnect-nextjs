import { randomUUID } from "node:crypto";

import type { Page } from "@playwright/test";

import { makePng } from "./images";
import { adminClient } from "./users";

/** A post created directly in the database and Storage, for tests about viewing one. */
export async function createPostFor(page: Page, username: string, caption: string) {
  const admin = adminClient();
  const { data: author } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single()
    .throwOnError();
  const path = `${author.id}/${randomUUID()}.png`;
  const { error } = await admin.storage
    .from("posts")
    .upload(path, await makePng(page), { contentType: "image/png" });
  if (error) throw error;
  const { data: post } = await admin
    .from("posts")
    .insert({
      author_id: author.id,
      image_path: path,
      image_width: 400,
      image_height: 300,
      caption,
      alt_text: "A green to violet gradient",
    })
    .select("id")
    .single()
    .throwOnError();
  return post.id;
}
