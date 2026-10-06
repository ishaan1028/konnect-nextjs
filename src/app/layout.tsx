import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";

import { NavigationProgress } from "@/components/layout/navigation-progress";
import { SkipLink } from "@/components/layout/skip-link";
import { ThemeScript } from "@/components/theme/theme-script";
import { ThemeSync } from "@/components/theme/theme-sync";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { env } from "@/lib/env";
import { QueryProvider } from "@/lib/query/provider";

import "./globals.css";

// next/font downloads fonts at build time and self-hosts them: no runtime
// request to Google, and fallback metrics are adjusted so text doesn't shift.
// Only the body face is preloaded: it's what the first paint needs. The others
// load on demand without competing with a page's main image for bandwidth,
// and their adjusted fallback metrics keep text from shifting when they swap in.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });
// Display face for headings and the wordmark.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    template: "%s · Konnect",
    default: "Konnect",
  },
  description: "Share moments, follow friends, and chat in real time.",
  applicationName: "Konnect",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Mobile browser chrome follows the OS scheme (matches our background tokens).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline theme script adds the `dark` class and
    // `data-accent` before React hydrates. This only silences <html> itself.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">
        <SkipLink />
        {/* Reads the URL, so it streams in instead of blocking the static shell. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {/* URL query state (?q= on Explore), shared through the app router. */}
        <NuqsAdapter>
          <QueryProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryProvider>
        </NuqsAdapter>
        <Toaster position="top-center" />
        <ThemeSync />
      </body>
    </html>
  );
}
