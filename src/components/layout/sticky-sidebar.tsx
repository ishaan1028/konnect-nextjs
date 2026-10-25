"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/** Space kept above and below the column while it's pinned. */
const GAP = 24;

/**
 * A side column that scrolls with the page but never leaves it (like X's).
 * Scrolling down, it moves with the content until its bottom reaches the
 * bottom of the window, then stays; scrolling up, it moves back until its
 * top shows, then stays. Taller or shorter than the window, both ends stay
 * reachable.
 *
 * It's plain `position: sticky` (the browser does the pinning, no jank); on
 * each scroll the `top` offset moves by the distance scrolled, clamped between
 * "bottom in view" and "top in view". The column's height is watched too,
 * since its widgets stream in.
 */
export function StickySidebar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const column = ref.current;
    if (!column) return;
    let top = GAP;
    let lastScrollY = window.scrollY;

    const update = () => {
      const scrollY = window.scrollY;
      // Bottom aligned: negative when the column is taller than the window.
      const lowest = Math.min(GAP, window.innerHeight - column.offsetHeight - GAP);
      top = Math.min(GAP, Math.max(lowest, top - (scrollY - lastScrollY)));
      lastScrollY = scrollY;
      column.style.top = `${top}px`;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const resizes = new ResizeObserver(update);
    resizes.observe(column);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizes.disconnect();
    };
  }, []);

  return (
    // self-start: a grid item stretched to the row's height couldn't stick.
    <div ref={ref} data-slot="sticky-sidebar" className={cn("sticky self-start", className)}>
      {children}
    </div>
  );
}
