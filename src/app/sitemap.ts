import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { connection } from "next/server";

import { env } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";

// shortcut: one sitemap of the newest 5,000 profiles and posts each; split it with generateSitemaps() past ~50,000 URLs.
const LIMIT = 5000;

/** The public, indexable pages, newest first (robots.ts points crawlers here). */
async function getPublicPages() {
  "use cache";
  cacheLife("hours");

  const supabase = createPublicClient();
  const [profiles, posts] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, updated_at")
      .order("updated_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("posts")
      .select("id, updated_at")
      .order("created_at", { ascending: false })
      .limit(LIMIT),
  ]);
  if (profiles.error) throw profiles.error;
  if (posts.error) throw posts.error;
  return { profiles: profiles.data, posts: posts.data };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Built per request (then cached for hours): the build never talks to the database.
  await connection();
  const { profiles, posts } = await getPublicPages();
  const url = (path: string) => new URL(path, env.NEXT_PUBLIC_SITE_URL).toString();

  return [
    ...profiles.map((profile) => ({
      url: url(`/${profile.username}`),
      lastModified: profile.updated_at,
    })),
    ...posts.map((post) => ({ url: url(`/p/${post.id}`), lastModified: post.updated_at })),
  ];
}
