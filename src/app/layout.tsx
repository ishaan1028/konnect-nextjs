import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";

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
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Display face for headings and the wordmark.
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

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
        <QueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryProvider>
        <Toaster position="top-center" />
        <ThemeSync />
      </body>
    </html>
  );
}
