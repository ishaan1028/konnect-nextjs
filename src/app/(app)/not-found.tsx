import type { Metadata } from "next";

import { NotFoundContent } from "@/components/shared/not-found-content";

export const metadata: Metadata = { title: "Page not found" };

// notFound() inside the app (e.g. an unknown username): the layout already
// provides <main> and the nav, so this is just the message.
export default function AppNotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-8 text-center">
      <NotFoundContent />
    </div>
  );
}
