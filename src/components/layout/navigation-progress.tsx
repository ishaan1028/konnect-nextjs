"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** If a navigation never lands (cancelled, failed), stop showing it after this. */
const GIVE_UP_AFTER_MS = 15_000;

/**
 * A thin bar across the top of the page while a link's next page is loading.
 *
 * - Starts on a click that Next's <Link> turns into a client-side navigation.
 * - Ends when the URL changes: Next updates it once the new page commits.
 * - Only fades in after 150ms, so instant (prefetched) navigations never flash.
 * - Indeterminate while loading (shadcn <Progress value={null}>): the real
 *   progress isn't knowable. On arrival it fills to 100% as it fades out.
 *
 * Decorative (aria-hidden): screen readers already hear the new page's title
 * from Next's route announcer. Render inside <Suspense> (it reads the URL).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = `${pathname}?${searchParams}`;
  const [loading, setLoading] = useState(false);

  // The URL changed: the navigation is over. Adjusting state while rendering
  // (rather than in an effect) avoids one frame of a stale bar.
  const [currentUrl, setCurrentUrl] = useState(url);
  if (url !== currentUrl) {
    setCurrentUrl(url);
    setLoading(false);
  }

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (isClientNavigation(event)) setLoading(true);
    }
    // Capture phase: runs before <Link>'s own handler navigates.
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), GIVE_UP_AFTER_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <div
      aria-hidden
      data-slot="navigation-progress"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-100 transition-opacity",
        loading ? "opacity-100 delay-150 duration-200" : "opacity-0 duration-300",
      )}
    >
      <Progress
        value={loading ? null : 100}
        // A hairline across the top edge instead of the default rounded track.
        className="**:data-[slot=progress-track]:h-0.75 **:data-[slot=progress-track]:rounded-none **:data-[slot=progress-track]:bg-transparent"
      />
    </div>
  );
}

/**
 * Mirrors the rules Next's <Link> uses to decide whether it handles a click:
 * a plain left click on a same-origin link that opens in this tab. Links to
 * the current page (or just a #hash on it) don't navigate, so they're skipped.
 */
function isClientNavigation(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

  const link = event.target instanceof Element ? event.target.closest("a") : null;
  if (!link?.href || link.hasAttribute("download")) return false;
  if (link.target && link.target !== "_self") return false;

  const to = new URL(link.href);
  return (
    to.origin === location.origin &&
    (to.pathname !== location.pathname || to.search !== location.search)
  );
}
