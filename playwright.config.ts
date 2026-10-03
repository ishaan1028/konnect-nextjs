import nextEnv from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Load .env.local exactly like Next does, so tests and app share one config.
nextEnv.loadEnvConfig(process.cwd());

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;
// CI (and `pnpm test:e2e:prod`) tests the production build that users get;
// locally, `pnpm test:e2e` reuses the running dev server for a fast loop.
const useProductionServer = isCI || process.env.E2E_PROD === "1";

/**
 * End-to-end tests drive a real browser against the real app and the local
 * Supabase stack (`pnpm db:start`). Emails are read from Mailpit.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  // The dev server compiles each route on its first visit, which can exceed the
  // default 5s under parallel load. Production responds fast, so keep it strict.
  expect: { timeout: useProductionServer ? 5_000 : 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: useProductionServer ? `pnpm start --port ${PORT}` : `pnpm dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !useProductionServer,
    timeout: 120_000,
  },
});
