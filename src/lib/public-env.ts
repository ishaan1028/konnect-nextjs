/**
 * The NEXT_PUBLIC_ variables, for code that runs in the browser.
 *
 * They're inlined at build time and already validated by `@/lib/env`, which
 * next.config.ts loads at build and dev start. Reading them here instead of
 * through `env` keeps Zod and the env validator out of the browser bundle.
 */
export const publicEnv = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
};
