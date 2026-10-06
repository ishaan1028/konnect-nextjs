"use client";

import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type RouteModalProps = {
  title: string;
  children: ReactNode;
  /**
   * "list": a fixed-size box with a visible title whose list scrolls inside
   * (the same size while loading and after). "wide": edge-to-edge content
   * (a post), titled for screen readers only, scrolling as a whole if taller
   * than the screen.
   */
  variant?: "list" | "wide";
};

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
 */
export function RouteModal({ title, children, variant = "list" }: RouteModalProps) {
  const router = useRouter();
  const wide = variant === "wide";

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent
        // The wide variant puts its own close button above the content, where
        // it can't cover anything (the default one sits on the post's ⋯ menu).
        showCloseButton={!wide}
        className={cn(
          wide
            ? // Square corners: a scroll container clips its children to its own
              // rounding, which cut off the close button; the post card inside
              // has its own rounded corners.
              "block max-h-[92dvh] overflow-y-auto rounded-none bg-transparent p-0 shadow-none ring-0 sm:max-w-5xl"
            : // Fixed height (not max-height): the same size while loading and
              // after; longer content scrolls inside it.
              "h-[min(36rem,85dvh)] grid-rows-[auto_1fr] gap-4 sm:max-w-md",
        )}
      >
        <DialogHeader className={cn(wide && "sr-only")}>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        {wide ? (
          <>
            <div className="sticky top-0 z-10 flex justify-end pb-2">
              <DialogClose render={<Button variant="secondary" size="icon" aria-label="Close" />}>
                <XIcon aria-hidden />
              </DialogClose>
            </div>
            {children}
          </>
        ) : (
          <div className="-mx-6 min-h-0 overflow-y-auto px-6">{children}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
