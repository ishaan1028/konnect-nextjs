import { expect, type Page, test } from "@playwright/test";

import { logIn } from "./support/auth";
import { demoUser } from "./support/users";

/*
 * Hydration mismatches (invalid HTML nesting, server/client differences) only
 * show up as console errors, while React quietly re-renders the page from
 * scratch, wiping anything the user already typed. This catches that whole
 * class of bug, for signed-out and signed-in pages alike.
 */

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function expectCleanLoad(page: Page, path: string, errors: string[]) {
  await page.goto(path);
  // Wait until the browser is idle so streaming and hydration have finished.
  await page.waitForLoadState("networkidle");
  expect(errors, `console errors on ${path}`).toEqual([]);
}

test.describe("signed out", () => {
  for (const path of ["/login", "/signup", "/forgot-password", "/reset-password", "/alex.demo"]) {
    test(`${path} renders and hydrates without console errors`, async ({ page }) => {
      const errors = collectErrors(page);
      await expectCleanLoad(page, path, errors);
    });
  }
});

test.describe("signed in", () => {
  test("app pages render and hydrate without console errors", async ({ page }) => {
    await page.goto("/login");
    await logIn(page, demoUser.email, demoUser.password);
    await expect(page).toHaveURL("/");

    // Only listen from here on: full page loads of signed-in pages, where the
    // user-specific parts stream in and must hydrate cleanly.
    const errors = collectErrors(page);
    for (const path of [
      "/",
      "/explore",
      "/settings/profile",
      "/settings/appearance",
      "/alex.demo",
    ]) {
      await expectCleanLoad(page, path, errors);
    }
  });
});
