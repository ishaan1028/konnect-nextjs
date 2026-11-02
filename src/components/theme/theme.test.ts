import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACCENT_STORAGE_KEY,
  MODE_STORAGE_KEY,
  syncThemeToDom,
  themeDomConfig,
} from "./theme-config";
import { getSnapshot, setAccent, setThemeMode } from "./theme-store";

/** jsdom has no matchMedia; simulate the OS color-scheme preference. */
function mockSystemDark(isDark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: isDark,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

const root = () => document.documentElement;

beforeEach(() => {
  localStorage.clear();
  root().className = "";
  root().removeAttribute("data-accent");
  root().style.colorScheme = "";
  mockSystemDark(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("inline theme script", () => {
  // The function is serialized with .toString() into <head>. If it ever
  // referenced an import or outer variable, the inlined copy would break.
  it("runs standalone, exactly as the browser executes it", () => {
    localStorage.setItem(MODE_STORAGE_KEY, "dark");
    localStorage.setItem(ACCENT_STORAGE_KEY, "indigo");

    const script = `(${syncThemeToDom.toString()})(${JSON.stringify(themeDomConfig)})`;
    new Function(script)();

    expect(root()).toHaveClass("dark");
    expect(root().dataset.accent).toBe("indigo");
    expect(root().style.colorScheme).toBe("dark");
  });

  it("follows the OS preference in system mode", () => {
    mockSystemDark(true);
    syncThemeToDom(themeDomConfig);

    expect(root()).toHaveClass("dark");
    expect(root().dataset.accent).toBe("sunset");
  });

  it("ignores tampered or unknown stored values", () => {
    localStorage.setItem(MODE_STORAGE_KEY, "neon");
    localStorage.setItem(ACCENT_STORAGE_KEY, "<script>");
    syncThemeToDom(themeDomConfig);

    expect(root()).not.toHaveClass("dark");
    expect(root().dataset.accent).toBe("sunset");
  });
});

describe("theme store", () => {
  it("persists and applies a mode change", () => {
    setThemeMode("dark");

    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("dark");
    expect(root()).toHaveClass("dark");
    expect(getSnapshot()).toMatchObject({ mode: "dark", resolvedMode: "dark" });
  });

  it("persists and applies an accent change", () => {
    setAccent("indigo");

    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe("indigo");
    expect(root().dataset.accent).toBe("indigo");
    expect(getSnapshot().accent).toBe("indigo");
  });

  it("returns the same snapshot object while nothing changes", () => {
    // useSyncExternalStore re-renders forever if this isn't referentially stable.
    expect(getSnapshot()).toBe(getSnapshot());
  });
});
