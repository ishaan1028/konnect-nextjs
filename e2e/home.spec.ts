import { expect, type Locator, type Page, test } from "@playwright/test";

/** Rolls the mouse wheel over the middle of `target`. */
async function wheelOver(page: Page, target: Locator, distance: number) {
  const box = await target.boundingBox();
  if (!box) throw new Error("target isn't on screen");
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height, 600) / 2);
  await page.mouse.wheel(0, distance);
}

const pageScroll = (page: Page) => page.evaluate(() => window.scrollY);

test.describe("home page side column", () => {
  test("stays put while the feed scrolls, and scrolls on its own", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Continue as demo user" }).click();
    await expect(page).toHaveURL("/");
    // Every widget loaded: the column has its final height.
    await expect(
      page.getByRole("region", { name: "Recent chats" }).getByRole("listitem").first(),
    ).toBeVisible();

    const column = page.locator('[data-slot="side-column"]');
    const columnScroll = () => column.evaluate((element) => element.scrollTop);
    const firstCardTop = () =>
      column.evaluate((element) =>
        Math.round(element.firstElementChild!.getBoundingClientRect().top),
      );
    // Taller than the window, so it has something to scroll.
    expect(await column.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
      true,
    );
    expect(await firstCardTop()).toBe(24);

    // Scrolling over the feed moves the page, not the column.
    await wheelOver(page, page.getByRole("region", { name: "Feed" }), 800);
    await expect.poll(() => pageScroll(page)).toBeGreaterThan(0);
    const scrolled = await pageScroll(page);
    expect(await firstCardTop()).toBe(24);
    expect(await columnScroll()).toBe(0);

    // Scrolling over the column moves only the column, even past its end.
    await wheelOver(page, column, 300);
    await expect.poll(columnScroll).toBeGreaterThan(0);
    await wheelOver(page, column, 5000);
    await expect
      .poll(() =>
        column.evaluate(
          (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
        ),
      )
      .toBeLessThanOrEqual(1);
    expect(await pageScroll(page)).toBe(scrolled);
  });
});
