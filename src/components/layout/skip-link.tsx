import { SkipLinkAnchor } from "./skip-link-anchor";

export const MAIN_CONTENT_ID = "main-content";

/** Lets keyboard and screen-reader users jump past the navigation. */
export function SkipLink() {
  return <SkipLinkAnchor targetId={MAIN_CONTENT_ID} />;
}
