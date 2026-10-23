import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";
import { NotFoundContent } from "@/components/shared/not-found-content";

export const metadata: Metadata = { title: "Page not found" };

// Rendered for any URL that matches no route (inside the app, (app)/not-found.tsx).
export default function NotFound() {
  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center outline-none"
    >
      <Logo />
      <NotFoundContent />
    </main>
  );
}
