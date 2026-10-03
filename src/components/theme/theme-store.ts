import {
  ACCENT_STORAGE_KEY,
  ACCENTS,
  type Accent,
  DARK_MEDIA_QUERY,
  DEFAULT_ACCENT,
  DEFAULT_MODE,
  MODE_STORAGE_KEY,
  type ResolvedThemeMode,
  syncThemeToDom,
  THEME_MODES,
  type ThemeMode,
  themeDomConfig,
} from "./theme-config";

/**
 * A tiny external store for the theme, read with React's useSyncExternalStore.
 *
 * The source of truth is localStorage plus the OS color-scheme media query,
 * both outside React. An external store lets every component read them
 * consistently, re-render on change, and stay in sync across browser tabs.
 */

export type ThemeSnapshot = {
  mode: ThemeMode;
  accent: Accent;
  resolvedMode: ResolvedThemeMode;
};

// The server can't know the user's preference, so it always renders defaults.
// React swaps in the real snapshot right after hydration (no mismatch error).
const SERVER_SNAPSHOT: ThemeSnapshot = {
  mode: DEFAULT_MODE,
  accent: DEFAULT_ACCENT,
  resolvedMode: "light",
};

function readStorage<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return allowed.find((item) => item === value) ?? fallback;
  } catch {
    return fallback;
  }
}

let cachedSnapshot: ThemeSnapshot | null = null;

function computeSnapshot(): ThemeSnapshot {
  const mode = readStorage(MODE_STORAGE_KEY, THEME_MODES, DEFAULT_MODE);
  const accent = readStorage(ACCENT_STORAGE_KEY, ACCENTS, DEFAULT_ACCENT);
  const systemDark = window.matchMedia(DARK_MEDIA_QUERY).matches;
  const resolvedMode: ResolvedThemeMode =
    mode === "system" ? (systemDark ? "dark" : "light") : mode;

  // useSyncExternalStore needs a stable reference while nothing changed,
  // otherwise it would re-render forever.
  if (
    cachedSnapshot?.mode === mode &&
    cachedSnapshot.accent === accent &&
    cachedSnapshot.resolvedMode === resolvedMode
  ) {
    return cachedSnapshot;
  }
  cachedSnapshot = { mode, accent, resolvedMode };
  return cachedSnapshot;
}

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

/** Re-applies the theme without animating every color transition at once. */
function applyWithoutTransitions() {
  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  syncThemeToDom(themeDomConfig);
  // Force a style recalculation so the new colors land with transitions off.
  void window.getComputedStyle(document.body).opacity;
  requestAnimationFrame(() => style.remove());
}

function handleExternalChange() {
  applyWithoutTransitions();
  emitChange();
}

function handleStorage(event: StorageEvent) {
  // Fired when another tab changes the theme.
  if (event.key === MODE_STORAGE_KEY || event.key === ACCENT_STORAGE_KEY) {
    handleExternalChange();
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // Attach the global listeners once, for the first subscriber.
  if (listeners.size === 1) {
    window.matchMedia(DARK_MEDIA_QUERY).addEventListener("change", handleExternalChange);
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.matchMedia(DARK_MEDIA_QUERY).removeEventListener("change", handleExternalChange);
      window.removeEventListener("storage", handleStorage);
    }
  };
}

export const getSnapshot = computeSnapshot;
export const getServerSnapshot = () => SERVER_SNAPSHOT;

function persist(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the change still applies for this page view.
  }
}

export function setThemeMode(mode: ThemeMode) {
  persist(MODE_STORAGE_KEY, mode);
  applyWithoutTransitions();
  emitChange();
}

export function setAccent(accent: Accent) {
  persist(ACCENT_STORAGE_KEY, accent);
  applyWithoutTransitions();
  emitChange();
}
