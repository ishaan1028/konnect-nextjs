import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

/**
 * /robots.txt: profiles (/[username]) and posts (/p/[id]) are public and
 * worth indexing; personal and account pages aren't.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/create",
        "/explore",
        "/messages",
        "/notifications",
        "/saved",
        "/settings",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/auth/",
      ],
    },
    sitemap: new URL("/sitemap.xml", env.NEXT_PUBLIC_SITE_URL).toString(),
  };
}
