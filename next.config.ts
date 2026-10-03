import type { NextConfig } from "next";

// Validates environment variables at build/dev start: a missing or malformed
// variable fails fast here instead of crashing at runtime.
import { env } from "./src/lib/env.ts";

const supabaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const isLocalSupabase = ["127.0.0.1", "localhost"].includes(supabaseUrl.hostname);

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
  images: {
    // Only public Storage files from *our* Supabase project can be optimized,
    // so the image optimizer can't be abused as an open proxy.
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    // Next 16 requires an explicit allow-list of qualities.
    qualities: [75],
    // Next 16 refuses to fetch images from private IPs (SSRF protection). Local
    // Supabase runs on 127.0.0.1, so allow it *only* when Supabase itself is
    // local (dev and CI); production keeps the protection.
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
  // Handled before rendering (no page needed): /settings opens its first tab.
  async redirects() {
    return [{ source: "/settings", destination: "/settings/profile", permanent: false }];
  },
};

export default nextConfig;
