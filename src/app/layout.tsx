import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { env } from "@/lib/env";

import "./globals.css";

// next/font downloads the fonts at build time and self-hosts them: no request
// to Google at runtime and no layout shift while the font loads.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Lets pages use relative URLs for canonical links and OG images.
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    // A child page that exports `title: "Explore"` renders as "Explore · Konnect".
    template: "%s · Konnect",
    default: "Konnect",
  },
  description: "Share moments, follow friends, and chat in real time.",
  applicationName: "Konnect",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
