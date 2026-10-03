// Shared by the server (inline script) and the client (store + UI), so it must
// not import anything browser- or server-specific.

export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export type ResolvedThemeMode = Exclude<ThemeMode, "system">;

// Each accent is a shadcn theme preset; its CSS variables live in globals.css.
export const ACCENTS = ["green", "violet"] as const;
export type Accent = (typeof ACCENTS)[number];

export const MODE_LABELS: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

// Swatch colors are fixed (not theme variables) so each one previews its own preset.
export const ACCENT_META: Record<Accent, { label: string; swatch: string }> = {
  green: { label: "Green", swatch: "oklch(0.627 0.194 149.214)" },
  violet: { label: "Violet", swatch: "oklch(0.541 0.281 293.009)" },
};

export const isThemeMode = (value: unknown): value is ThemeMode =>
  THEME_MODES.some((mode) => mode === value);
export const isAccent = (value: unknown): value is Accent =>
  ACCENTS.some((accent) => accent === value);

export const DEFAULT_MODE: ThemeMode = "system";
export const DEFAULT_ACCENT: Accent = "green";

export const MODE_STORAGE_KEY = "konnect:theme-mode";
export const ACCENT_STORAGE_KEY = "konnect:theme-accent";

export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export type ThemeDomConfig = {
  modeKey: string;
  accentKey: string;
  modes: readonly string[];
  accents: readonly string[];
  defaultMode: string;
  defaultAccent: string;
  darkQuery: string;
};

export const themeDomConfig: ThemeDomConfig = {
  modeKey: MODE_STORAGE_KEY,
  accentKey: ACCENT_STORAGE_KEY,
  modes: THEME_MODES,
  accents: ACCENTS,
  defaultMode: DEFAULT_MODE,
  defaultAccent: DEFAULT_ACCENT,
  darkQuery: DARK_MEDIA_QUERY,
};

/**
 * Reads the saved preference and applies it to <html>.
 *
 * This one function runs in two places:
 * 1. Serialized with .toString() into an inline <head> script, so it runs while
 *    the HTML is still being parsed, before first paint. That's why it must be
 *    fully self-contained (no imports, no closures).
 * 2. From the client theme store, whenever the user changes a setting.
 */
export function syncThemeToDom(config: ThemeDomConfig): void {
  try {
    const root = document.documentElement;
    const read = (key: string, allowed: readonly string[], fallback: string) => {
      const value = window.localStorage.getItem(key);
      return value !== null && allowed.includes(value) ? value : fallback;
    };

    const mode = read(config.modeKey, config.modes, config.defaultMode);
    const accent = read(config.accentKey, config.accents, config.defaultAccent);
    const isDark =
      mode === "dark" || (mode === "system" && window.matchMedia(config.darkQuery).matches);

    root.classList.toggle("dark", isDark);
    // Makes native UI (scrollbars, form controls) match the theme.
    root.style.colorScheme = isDark ? "dark" : "light";
    root.dataset.accent = accent;
  } catch {
    // localStorage can throw (privacy mode, blocked storage): keep the defaults.
  }
}
