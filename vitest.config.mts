import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Vite 8 understands tsconfig "paths" natively, so "@/..." imports just work.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Vitest doesn't load Next's .env files; give tests a predictable env instead.
    env: { SKIP_ENV_VALIDATION: "1" },
    css: false,
  },
});
