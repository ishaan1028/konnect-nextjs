"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

/** The current time, rounded down to the minute (stable between ticks). */
const snapshot = () => Math.floor(Date.now() / MINUTE) * MINUTE;

/**
 * On the server (and while hydrating) there's no "now" to agree on: reading
 * the clock there would make the HTML differ from the browser's first render,
 * and Next refuses clock reads while prerendering. So the server snapshot is
 * null, and callers render something time-independent until the browser's
 * first update.
 */
const serverSnapshot = () => null;

function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, MINUTE);
  return () => clearInterval(timer);
}

/**
 * The current time for rendering (null on the server and during hydration),
 * updated every minute so "5m" ages to "6m" on its own. Reading the clock in a
 * store (not in render) keeps components pure, as React expects.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
