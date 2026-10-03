import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Single source of truth for environment variables.
 *
 * - `server` vars are only readable on the server; importing them in a client
 *   component throws, so secrets can't leak into the browser bundle.
 * - `client` vars must start with NEXT_PUBLIC_ and are inlined at build time,
 *   which is why each one is listed explicitly in `experimental__runtimeEnv`.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Bypasses Row Level Security. Only for trusted server code (lib/supabase/admin.ts).
    SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_"),
    // Optional shared demo account behind the "Continue as demo user" button.
    // Credentials stay on the server; the button is hidden when they're unset.
    DEMO_USER_EMAIL: z.email().optional(),
    DEMO_USER_PASSWORD: z.string().min(8).optional(),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    // Safe to expose: it can only do what Row Level Security policies allow.
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith("sb_publishable_"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  // Treat `FOO=` in a .env file as unset so defaults/required checks apply.
  emptyStringAsUndefined: true,
  // No skipValidation escape hatch on purpose: skipping also drops the defaults
  // above, so a "skipped" build crashes later with less helpful errors. CI and
  // tests provide explicit non-secret values instead.
});
