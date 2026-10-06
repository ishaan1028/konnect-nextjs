"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

/** The current time, rounded down to the minute (stable between ticks). */
const snapshot = () => Math.floor(Date.now() / MINUTE) * MINUTE;

function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, MINUTE);
  return () => clearInterval(timer);
}

/**
 * The current time for rendering, updated every minute, so "5m" ages to "6m"
 * on its own. Reading the clock in a store (not in render) keeps components
 * pure, as React expects.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
