"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * A dialog for an *intercepted route*: the URL changes (shareable, survives a
 * refresh as the full page), and closing it goes back in history, exactly as
 * the browser's Back button would.
 *
 * The URL is the only state: while this route is shown the dialog is open, and
 * closing it navigates back. There's deliberately no local open/closed state.
 * With Cache Components, Next keeps visited routes mounted (hidden) and
 * restores their state, so a remembered "closed" would keep the dialog shut
 * the next time the same URL is opened.
 *
 * The height is fixed (not a max-height), so the dialog keeps the same size
 * while its content loads and after; longer content scrolls inside it.
 */
export function RouteModal({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="h-[min(36rem,85dvh)] grid-rows-[auto_1fr] gap-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        <div className="-mx-6 min-h-0 overflow-y-auto px-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
