import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { logIn, logOut } from "./support/auth";
import { getEmailLink } from "./support/mailpit";
import { createConfirmedUser, demoUser, uniqueUser } from "./support/users";

test.describe("sign up", () => {
  test("creates an account and lands on the feed, signed in", async ({ page }) => {
    const user = uniqueUser();
    await page.goto("/signup");

    await page.getByLabel("Full name").fill(user.fullName);
    await page.getByLabel("Username").fill(user.username);
    await expect(page.getByText(`@${user.username} is available`)).toBeVisible();
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Create account" }).click();

    // Email confirmation is off (production sends no email): straight in.
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Home feed" })).toBeAttached();

    await logOut(page);
  });

  test("says when the email already has an account", async ({ page }) => {
    const user = uniqueUser();
    await page.goto("/signup");
    await page.getByLabel("Full name").fill(user.fullName);
    await page.getByLabel("Username").fill(user.username);
    await page.getByLabel("Email").fill(demoUser.email);
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("An account with this email already exists")).toBeVisible();
    await expect(page).toHaveURL("/signup");
  });

  test("flags a username that's already taken", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Username").fill("Dario.Altman");
    await expect(page.getByText("@dario.altman isn't available")).toBeVisible();
  });

  test("validates fields before calling the server", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("Enter your name")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  });
});

test.describe("log in", () => {
  test("sends signed-out visitors to login, then back where they were going", async ({ page }) => {
    await page.goto("/explore");
    await expect(page).toHaveURL("/login?next=%2Fexplore");

    await logIn(page, demoUser.email, demoUser.password);
    await expect(page).toHaveURL("/explore");
  });

  test("never redirects to another site after login", async ({ page }) => {
    await page.goto("/login?next=https://evil.example");
    await logIn(page, demoUser.email, demoUser.password);
    await expect(page).toHaveURL("/");
  });

  test("shows one generic message for wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await logIn(page, demoUser.email, "wrong-password-1");
    // Filter by text: Next.js's own route announcer is also role="alert".
    await expect(
      page.getByRole("alert").filter({ hasText: "Incorrect email or password." }),
    ).toBeVisible();
  });

  test("offers a one-click demo account", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Continue as demo user" }).click();
    await expect(page).toHaveURL("/");
  });

  test("bounces signed-in users away from the auth pages", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Continue as demo user" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/signup");
    await expect(page).toHaveURL("/");
  });

  test("explains expired or reused email links", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=not-a-real-token&type=email&next=/");
    await expect(page).toHaveURL("/login?error=link-expired");
    await expect(
      page.getByRole("alert").filter({ hasText: "expired or was already used" }),
    ).toBeVisible();
  });
});

// Off with email: production sends none (see the note in login-form.tsx).
test.describe.skip("password reset", () => {
  test("emails a link that lets the user choose a new password", async ({ page }) => {
    const user = await createConfirmedUser();
    const newPassword = "brand-new-pass-42";

    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(user.email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();

    await page.goto(await getEmailLink(user.email, "Reset your Konnect password"));
    await expect(page).toHaveURL("/reset-password");

    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm new password").fill(newPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page).toHaveURL("/");

    await logOut(page);
    await logIn(page, user.email, newPassword);
    await expect(page).toHaveURL("/");
  });

  test("tells visitors without a valid link to request a new one", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByText("This reset link has expired")).toBeVisible();
  });
});

test.describe("accessibility", () => {
  for (const path of ["/login", "/signup"]) {
    test(`${path} has no detectable WCAG 2.2 AA violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
