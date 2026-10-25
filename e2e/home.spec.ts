import { expect, type Page, test } from "@playwright/test";

const GAP = 24;

/** The side column's top and bottom on screen, and the window's height. */
const sidebar = (page: Page) =>
  page.locator('[data-slot="sticky-sidebar"]').evaluate((element) => {
    const { top, bottom, height } = element.getBoundingClientRect();
    return { top: Math.round(top), bottom: Math.round(bottom), height, viewport: innerHeight };
  });

/** Polls a position until it's within a pixel of `target` (layout rounds sub-pixels). */
const settlesAt = (read: () => Promise<number>, target: number) =>
  expect.poll(async () => Math.abs((await read()) - target)).toBeLessThanOrEqual(1);

const scrollBy = (page: Page, distance: number) =>
  page.evaluate((y) => window.scrollBy(0, y), distance);

test.describe("home page side column", () => {
  test("scrolls with the feed but always keeps its top or bottom in view", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Continue as demo user" }).click();
    await expect(page).toHaveURL("/");
    // Every widget loaded: the column has its final height.
    await expect(
      page.getByRole("region", { name: "Recent chats" }).getByRole("listitem").first(),
    ).toBeVisible();
    const start = await sidebar(page);
    expect(start.height).toBeGreaterThan(start.viewport); // taller than the window

    // At the end of the feed, the column's bottom is in view (not blank space).
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await settlesAt(async () => (await sidebar(page)).bottom, start.viewport - GAP);

    // Scrolling up, it comes back down with the page instead of staying frozen...
    await scrollBy(page, -200);
    await settlesAt(async () => (await sidebar(page)).bottom, start.viewport - GAP + 200);

    // ...until its top shows, mid-page, where it stays.
    await scrollBy(page, -start.height);
    await settlesAt(async () => (await sidebar(page)).top, GAP);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    // And scrolling down again, it moves with the page.
    await scrollBy(page, 100);
    await settlesAt(async () => (await sidebar(page)).top, GAP - 100);
  });
});
