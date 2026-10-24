import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/**
 * axe on every main route, in all four themes (light/dark × green/violet), so
 * a color that only fails contrast in one combination can't slip through.
 */

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const POST = "/p/5eed1000-0000-4000-8000-000000000012";
const CHAT = "/messages/5eed3000-0000-4000-8000-000000000001";

const SIGNED_OUT = ["/login", "/signup", "/forgot-password", POST, "/maya.k", "/no-such-page-404"];
const SIGNED_IN = [
  "/",
  "/explore",
  "/explore?q=maya",
  POST,
  "/maya.k",
  "/maya.k/followers",
  "/saved",
  "/create",
  "/messages",
  CHAT,
  "/notifications",
  "/settings/profile",
  "/settings/account",
  "/settings/appearance",
];

const THEMES = [
  { mode: "light", accent: "green" },
  { mode: "dark", accent: "green" },
  { mode: "light", accent: "violet" },
  { mode: "dark", accent: "violet" },
] as const;

/** Runs axe on each route once its content has streamed in; returns every violation. */
async function audit(page: Page, routes: string[]) {
  const failures: { route: string; rule: string; targets: string[] }[] = [];
  for (const route of routes) {
    await page.goto(route);
    // Skeletons are placeholders, not content: wait for what replaces them.
    await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    for (const violation of violations) {
      failures.push({
        route,
        rule: violation.id,
        targets: violation.nodes.map((node) => node.target.join(" ")),
      });
    }
  }
  return failures;
}

for (const theme of THEMES) {
  test.describe(`${theme.mode} + ${theme.accent}`, () => {
    test.beforeEach(async ({ page }) => {
      // Animations and transitions could catch elements mid-fade (wrong contrast).
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(({ mode, accent }) => {
        localStorage.setItem("konnect:theme-mode", mode);
        localStorage.setItem("konnect:theme-accent", accent);
      }, theme);
    });

    test("signed-out pages have no detectable WCAG 2.2 AA violations", async ({ page }) => {
      expect(await audit(page, SIGNED_OUT)).toEqual([]);
    });

    test("signed-in pages have no detectable WCAG 2.2 AA violations", async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto("/login");
      await page.getByRole("button", { name: "Continue as demo user" }).click();
      await expect(page).toHaveURL("/");
      expect(await audit(page, SIGNED_IN)).toEqual([]);
    });
  });
}

test("keyboard: the skip link works, and closing a menu or dialog returns focus", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as demo user" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/maya.k");

  // The first Tab reaches "Skip to content", which moves focus past the nav.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  // Without a "#main-content" history entry (route modals close with history.back()).
  await expect(page).toHaveURL("/maya.k");

  // A menu opened from the keyboard closes with Escape, back on its button.
  const more = page.getByRole("button", { name: "More", exact: true });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(more).toBeFocused();

  // A dialog takes focus while open and gives it back when closed.
  const followers = page
    .getByRole("list", { name: "Profile stats" })
    .getByRole("link", { name: /followers?/ });
  await followers.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Followers" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(followers).toBeFocused();
});
