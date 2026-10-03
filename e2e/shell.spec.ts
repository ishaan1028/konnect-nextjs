import { expect, test } from "@playwright/test";

import { logIn, logOut } from "./support/auth";
import { createConfirmedUser, demoUser } from "./support/users";

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
