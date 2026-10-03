"use client";

import { useLayoutEffect } from "react";

import { syncThemeToDom, themeDomConfig } from "./theme-config";

/**
 * In development, React Strict Mode remounts the tree once and resets <html>'s
 * attributes to what JSX declares, wiping the class the inline script added.
 * Re-applying in a layout effect (before paint) fixes that. In production the
 * inline script has already done the work, so this is a cheap no-op.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    syncThemeToDom(themeDomConfig);
  }, []);

  return null;
}
