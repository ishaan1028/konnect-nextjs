import type { NextConfig } from "next";

// Validates environment variables at build/dev start: a missing or malformed
// variable fails fast here instead of crashing at runtime.
import "./src/lib/env.ts";

const nextConfig: NextConfig = {
  // Auto-memoizes components and hooks, so we don't hand-write useMemo/useCallback.
  reactCompiler: true,
  // Partial Prerendering: a static HTML shell is served instantly and dynamic
  // parts stream in. Data is dynamic by default; we opt into caching with "use cache".
  cacheComponents: true,
  // <Link href> and router.push() are type-checked against real routes.
  typedRoutes: true,
  poweredByHeader: false,
  // Dev-only badge; bottom-left would cover the side rail's "More" button.
  devIndicators: { position: "bottom-right" },
  // Handled before rendering (no page needed): /settings opens its first tab.
  async redirects() {
    return [{ source: "/settings", destination: "/settings/profile", permanent: false }];
  },
};

export default nextConfig;
