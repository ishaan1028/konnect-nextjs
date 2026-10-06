import type { MetadataRoute } from "next";

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
        "/saved",
        "/settings",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/auth/",
      ],
    },
  };
}
