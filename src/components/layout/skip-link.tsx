export const MAIN_CONTENT_ID = "main-content";

/** Lets keyboard and screen-reader users jump past the navigation. */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="fixed top-3 left-3 z-100 -translate-y-20 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform focus-visible:translate-y-0"
    >
      Skip to content
    </a>
  );
}
