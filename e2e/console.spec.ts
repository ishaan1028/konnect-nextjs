import { expect, test } from "@playwright/test";

/*
 * Hydration mismatches (invalid HTML nesting, server/client differences) only
 * show up as console errors, while React quietly re-renders the page from
 * scratch, wiping anything the user already typed. This catches that whole
 * class of bug on every page we render.
 */
const PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

for (const path of PAGES) {
  test(`${path} renders and hydrates without console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(path);
    // Wait until the browser is idle so hydration has definitely finished.
    await page.waitForLoadState("networkidle");

    expect(errors).toEqual([]);
  });
}
