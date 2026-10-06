import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { logIn } from "./support/auth";
import { makePng } from "./support/images";
import { createConfirmedUser, demoUser, uniqueUser } from "./support/users";

test.describe("public profile", () => {
  test("shows the profile with its own title and canonical URL", async ({ page }) => {
    await page.goto("/alex.demo");

    await expect(page.getByRole("heading", { level: 1, name: "@alex.demo" })).toBeVisible();
    // Scoped to <main>: Next streams the <title> (which also contains the name)
    // into <body> when metadata depends on request-time data.
    const main = page.getByRole("main");
    await expect(main.getByText("Alex Rivera")).toBeVisible();
    await expect(main.getByText("Just here to show you around Konnect")).toBeVisible();
    await expect(page).toHaveTitle("Alex Rivera (@alex.demo) · Konnect");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/alex\.demo$/);
  });

  test("redirects mixed-case usernames to the canonical URL", async ({ page }) => {
    await page.goto("/Alex.Demo");
    await expect(page).toHaveURL("/alex.demo");
  });

  test("shows the not-found page for unknown usernames", async ({ page }) => {
    await page.goto(`/${uniqueUser().username}`);
    await expect(page.getByRole("heading", { name: "This page took a day off" })).toBeVisible();
  });

  test("offers Edit profile only to the owner", async ({ page }) => {
    const user = await createConfirmedUser();
    await page.goto("/login");
    await logIn(page, user.email, user.password);
    await expect(page).toHaveURL("/");

    await page.goto(`/${user.username}`);
    await expect(page.getByRole("link", { name: "Edit profile" })).toBeVisible();

    await page.goto("/alex.demo");
    await expect(page.getByRole("heading", { name: "@alex.demo" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit profile" })).toHaveCount(0);
  });
});

test.describe("edit profile", () => {
  test("saves name, username and bio, and the cached public profile updates at once", async ({
    page,
  }) => {
    const user = await createConfirmedUser();
    const newUsername = uniqueUser().username;
    // Regression check: saving used to re-feed new defaultValues into
    // already-initialized inputs, which Base UI warns about.
    const baseUiWarnings: string[] = [];
    page.on("console", (message) => {
      if (message.text().includes("Base UI")) baseUiWarnings.push(message.text());
    });

    await page.goto("/login");
    await logIn(page, user.email, user.password);
    await expect(page).toHaveURL("/");

    // Visit the public profile first, so it's in the cache.
    await page.goto(`/${user.username}`);
    await expect(page.getByRole("main").getByText(user.fullName)).toBeVisible();

    await page.goto("/settings/profile");
    const save = page.getByRole("button", { name: "Save changes" });
    await expect(save).toBeDisabled(); // nothing changed yet

    await page.getByLabel("Full name").fill("Maya Kapoor");
    await page.getByLabel("Username").fill(newUsername);
    await expect(page.getByText(`@${newUsername} is available`)).toBeVisible();
    await page.getByLabel("Bio").fill("Film photography and long walks 📷");
    await save.click();

    await expect(page.getByText("Profile updated")).toBeVisible();
    await expect(save).toBeDisabled(); // the saved values are the new baseline
    // The nav reads the updated TanStack cache: no reload needed. (Scoped to
    // the main nav: the settings tabs also have a "Profile" link.)
    const mainNav = page.getByRole("navigation", { name: "Main" });
    await expect(mainNav.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      `/${newUsername}`,
    );

    expect(baseUiWarnings).toEqual([]);

    // updateTag() expired the cached profile: fresh data on the next request.
    await page.goto(`/${newUsername}`);
    await expect(page.getByRole("main").getByText("Maya Kapoor")).toBeVisible();
    await expect(page.getByText("Film photography and long walks 📷")).toBeVisible();

    // The old username no longer resolves.
    await page.goto(`/${user.username}`);
    await expect(page.getByRole("heading", { name: "This page took a day off" })).toBeVisible();
  });

  test("rejects a username that's already taken", async ({ page }) => {
    const user = await createConfirmedUser();
    await page.goto("/login");
    await logIn(page, user.email, user.password);
    await expect(page).toHaveURL("/");

    await page.goto("/settings/profile");
    await page.getByLabel("Username").fill("alex.demo");
    await expect(page.getByText("@alex.demo isn't available")).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("That username isn't available")).toBeVisible();
  });
});

test.describe("demo account", () => {
  test("is read-only: notice shown and every profile control disabled", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Continue as demo user" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/settings/profile");
    await expect(page.getByText("This is the shared demo account")).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeDisabled();
    await expect(page.getByLabel("Bio")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Upload photo" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
});

test.describe("profile photo", () => {
  test("uploads a cropped photo, shows it everywhere, then removes it", async ({ page }) => {
    const user = await createConfirmedUser();
    await page.goto("/login");
    await logIn(page, user.email, user.password);
    await expect(page).toHaveURL("/");

    await page.goto("/settings/profile");
    // Use the photo the way a person does: click the visible button and pick a
    // file in the chooser. Retried, because a click that lands before React has
    // hydrated the button does nothing (no handler attached yet).
    const png = await makePng(page);
    await expect(async () => {
      const chooser = page.waitForEvent("filechooser", { timeout: 1_000 });
      await page.getByRole("button", { name: "Upload photo" }).click();
      await (await chooser).setFiles({ name: "me.png", mimeType: "image/png", buffer: png });
    }).toPass();

    const dialog = page.getByRole("dialog", { name: "Crop your photo" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Save photo" }).click();
    await expect(page.getByText("Profile photo updated")).toBeVisible();
    await expect(dialog).toBeHidden();

    // Served through Next's image optimizer from our Supabase Storage bucket.
    const navAvatar = page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Profile" })
      .locator("img");
    await expect(navAvatar).toHaveAttribute("src", /\/_next\/image\?url=.*avatars/);

    await page.goto(`/${user.username}`);
    await expect(page.locator("header img").first()).toHaveAttribute("src", /avatars/);

    await page.goto("/settings/profile");
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Profile photo removed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload photo" })).toBeVisible();
  });
});

test.describe("accessibility", () => {
  const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

  test("the public profile has no detectable WCAG 2.2 AA violations", async ({ page }) => {
    await page.goto("/alex.demo");
    await expect(page.getByRole("heading", { name: "@alex.demo" })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(violations).toEqual([]);
  });

  test("profile settings have no detectable WCAG 2.2 AA violations", async ({ page }) => {
    await page.goto("/login");
    await logIn(page, demoUser.email, demoUser.password);
    await expect(page).toHaveURL("/");
    await page.goto("/settings/profile");
    await expect(page.getByLabel("Bio")).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(violations).toEqual([]);
  });
});
