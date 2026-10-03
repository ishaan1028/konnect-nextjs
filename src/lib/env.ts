import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Single source of truth for environment variables.
 *
 * - `server` vars are only readable on the server; importing them in a client
 *   component throws, so secrets can't leak into the browser bundle.
 * - `client` vars must start with NEXT_PUBLIC_ and are inlined at build time,
 *   which is why each one is listed explicitly in `experimental__runtimeEnv`.
 *
 * Supabase keys get added here in Phase 3.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  // Treat `FOO=` in a .env file as unset so defaults/required checks apply.
  emptyStringAsUndefined: true,
  // No skipValidation escape hatch on purpose: skipping also drops the defaults
  // above, so a "skipped" build crashes later with less helpful errors. CI and
  // tests provide explicit non-secret values instead.
});
