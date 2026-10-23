"use client";

/**
 * Focuses the target instead of following "#…": a hash link adds a history
 * entry, and route modals close with history.back(), which would land on it.
 * Before hydration it's a plain in-page link.
 */
export function SkipLinkAnchor({ targetId }: { targetId: string }) {
  return (
    <a
      href={`#${targetId}`}
      onClick={(event) => {
        const target = document.getElementById(targetId);
        if (!target) return;
        event.preventDefault();
        target.focus();
      }}
      className="fixed top-3 left-3 z-100 -translate-y-20 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform focus-visible:translate-y-0"
    >
      Skip to content
    </a>
  );
}
