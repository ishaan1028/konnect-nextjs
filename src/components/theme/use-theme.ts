"use client";

import { useSyncExternalStore } from "react";

import {
  getServerSnapshot,
  getSnapshot,
  setAccent,
  setThemeMode,
  subscribe,
  type ThemeSnapshot,
} from "./theme-store";

export type UseThemeResult = ThemeSnapshot & {
  setMode: typeof setThemeMode;
  setAccent: typeof setAccent;
};

/** Read and change the current theme mode (light/dark/system) and accent. */
export function useTheme(): UseThemeResult {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { ...snapshot, setMode: setThemeMode, setAccent };
}
