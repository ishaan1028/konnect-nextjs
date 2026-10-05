import { expect, test } from "@playwright/test";

import { logIn, logOut } from "./support/auth";
import { adminClient, createConfirmedUser, demoUser } from "./support/users";

test.describe("signed-in app shell", () => {
  test("shows the current user in the nav, menu and greeting", async ({ page }) => {
    await page.goto("/login");
    await logIn(page, demoUser.email, demoUser.password);
    await expect(page).toHaveURL("/");

    // Streamed in behind Suspense from the server-prefetched TanStack cache.
    await expect(page.getByText("Welcome back, Alex")).toBeVisible();
    await expect(page.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/alex.demo");

    await page.getByRole("button", { name: "More", exact: true }).click();
    await expect(page.getByText("Signed in as @alex.demo")).toBeVisible();
  });

  test("never shows the previous user's data after switching accounts", async ({ page }) => {
    const other = await createConfirmedUser();

    await page.goto("/login");
    await logIn(page, demoUser.email, demoUser.password);
    await expect(page.getByText("Welcome back, Alex")).toBeVisible();

    await logOut(page);
    await logIn(page, other.email, other.password);

    await expect(page.getByText("Welcome back, Test")).toBeVisible();
    await expect(page.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      `/${other.username}`,
    );
  });

  test("shows a progress bar at the top while a slow navigation loads", async ({ page }) => {
    // No prefetching, and every page takes a second: like a slow network.
    await page.route("**/*", async (route) => {
      const headers = route.request().headers();
      if (Object.keys(headers).some((name) => name.includes("prefetch"))) return route.abort();
      if (headers.rsc) await new Promise((resolve) => setTimeout(resolve, 1000));
      return route.continue();
    });
    await page.goto("/login");
    await logIn(page, demoUser.email, demoUser.password);
    await expect(page.getByText("Welcome back, Alex")).toBeVisible();

    const bar = page.locator('[data-slot="navigation-progress"]');
    await expect(bar).toHaveCSS("opacity", "0");
    await page.getByRole("link", { name: "Explore" }).first().click();
    await expect(bar).toHaveCSS("opacity", "1");
    await expect(page).toHaveURL("/explore");
    await expect(bar).toHaveCSS("opacity", "0");
  });

  test("a return visit shows cached data at once, then refreshes it in the background", async ({
    page,
  }) => {
    const user = await createConfirmedUser();
    await page.goto("/login");
    await logIn(page, user.email, user.password);
    await expect(page.getByText("Welcome back, Test")).toBeVisible();

    // The name changes on the server while the user is elsewhere in the app
    // (Explore doesn't load the current user, so the cache keeps the old name).
    await page.getByRole("link", { name: "Explore" }).first().click();
    await expect(page).toHaveURL("/explore");
    const { error } = await adminClient()
      .from("profiles")
      .update({ full_name: "Renamed Person" })
      .eq("username", user.username);
    expect(error).toBeNull();

    // Record every greeting the home page shows from here on.
    await page.evaluate(() => {
      const seen: string[] = [];
      Object.assign(window, { greetings: seen });
      new MutationObserver(() => {
        const text = [...document.querySelectorAll<HTMLElement>("main p")].find(
          (p) => p.offsetParent && p.textContent?.startsWith("Welcome"),
        )?.textContent;
        if (text && seen.at(-1) !== text) seen.push(text);
      }).observe(document.body, { subtree: true, childList: true, characterData: true });
    });
    await page.getByRole("link", { name: "Home" }).first().click();

    await expect(page.getByText("Welcome back, Renamed")).toBeVisible();
    const greetings = await page.evaluate(
      () => (window as unknown as { greetings: string[] }).greetings,
    );
    // The cached name came first (stale-while-revalidate), then the fresh one.
    expect(greetings.indexOf("Welcome back, Test")).toBeGreaterThanOrEqual(0);
    expect(greetings.indexOf("Welcome back, Test")).toBeLessThan(
      greetings.indexOf("Welcome back, Renamed"),
    );
  });
});

test.describe("signed-out visitor on a public page", () => {
  test("is offered to log in instead of a profile link", async ({ page }) => {
    await page.goto("/alex.demo");

    await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    await page.getByRole("button", { name: "More", exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Log out" })).toHaveCount(0);
  });
});
