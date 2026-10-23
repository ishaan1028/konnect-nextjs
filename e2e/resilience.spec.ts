import { expect, test } from "@playwright/test";

const POST = "/p/5eed1000-0000-4000-8000-000000000012";

test.describe("when loading fails", () => {
  test("a list shows an error in place and loads again on Try again", async ({ page }) => {
    // The likers list is fetched in the browser when the dialog opens.
    await page.route("**/rest/v1/rpc/get_post_likers*", (route) => route.abort());
    await page.goto(POST);
    await page.getByRole("button", { name: /\d+ likes?/ }).click();
    const dialog = page.getByRole("dialog", { name: "Likes" });

    // After TanStack's retries, only this section shows the error; the page stays.
    await expect(dialog.getByText("Couldn't load likes.")).toBeVisible({ timeout: 20_000 });
    // (Under the open dialog the page is inert, so it's found by tag, not role.)
    await expect(page.locator("h1", { hasText: "Post by @zoe.travels" })).toBeAttached();

    await page.unroute("**/rest/v1/rpc/get_post_likers*");
    await dialog.getByRole("button", { name: "Try again" }).click();
    await expect(dialog.getByRole("listitem").first()).toBeVisible();
    await expect(dialog.getByText("Couldn't load likes.")).toHaveCount(0);
  });

  test("a failed search says so instead of “no results”", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Continue as demo user" }).click();
    await expect(page).toHaveURL("/");
    await page.route("**/rest/v1/rpc/search_profiles*", (route) => route.abort());
    await page.goto("/explore?q=maya");
    await expect(page.getByText("Couldn't search right now.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/No people match/)).toHaveCount(0);

    await page.unroute("**/rest/v1/rpc/search_profiles*");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("link", { name: /maya\.k/ })).toBeVisible();
  });
});

test.describe("SEO and install", () => {
  test("robots.txt points to a sitemap of public profiles and posts", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/maya.k</loc>");
    expect(sitemap).toContain(`${POST}</loc>`);
  });

  test("the app can be installed: manifest and icons", async ({ page, request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({ name: "Konnect", display: "standalone", start_url: "/" });
    for (const icon of manifest.icons as { src: string }[]) {
      expect((await request.get(icon.src)).ok()).toBe(true);
    }

    await page.goto("/login");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest",
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  });
});
