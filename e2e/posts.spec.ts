import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { signUpAndLogIn } from "./support/auth";
import { makePng } from "./support/images";
import { createPostFor } from "./support/posts";
import { createConfirmedUser } from "./support/users";

/** Picks a photo on /create (the file input is behind the button). */
async function pickPhoto(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  // Retried: before hydration the button has no click handler yet.
  await expect(async () => {
    const chooser = page.waitForEvent("filechooser", { timeout: 1_000 });
    await page.getByRole("button", { name: "Choose from your device" }).click();
    await (await chooser).setFiles(file);
  }).toPass();
}

test.describe("posts", () => {
  test("create, edit and delete a post", async ({ page }) => {
    const user = await signUpAndLogIn(page);
    await page.goto("/create");

    // Pick → crop (portrait) → details → share.
    await pickPhoto(page, {
      name: "photo.png",
      mimeType: "image/png",
      buffer: await makePng(page, 1200, 900),
    });
    await page.getByRole("button", { name: "Portrait (4:5)" }).click();
    await expect(page.getByRole("button", { name: "Portrait (4:5)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByLabel("Caption").fill("First light over the hills");
    await page.getByLabel("Location").fill("Lisbon");
    await page.getByLabel("Alt text").fill("A green to violet gradient");
    await page.getByRole("button", { name: "Share", exact: true }).click();

    // The new post opens, replacing /create in the history.
    await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
    const post = page.getByRole("article", { name: `Post by @${user.username}` });
    await expect(post.getByText("First light over the hills")).toBeVisible();
    await expect(post.getByText("Lisbon")).toBeVisible();
    const photo = post.getByRole("img", { name: "A green to violet gradient" });
    await expect(photo).toBeVisible();
    // Stored as a 4:5 crop, at most 1080px wide.
    const size = await photo.evaluate((img: HTMLImageElement) => [img.width, img.height]);
    expect(size[1]! / size[0]!).toBeCloseTo(5 / 4, 1);

    // Edit the caption.
    await post.getByRole("button", { name: "Post options" }).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit post" });
    await dialog.getByLabel("Caption").fill("Edited: first light");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Post updated")).toBeVisible();
    await expect(post.getByText("Edited: first light")).toBeVisible();

    // It's on the profile, counted as one post.
    await page.goto(`/${user.username}`);
    await expect(page.getByRole("list", { name: "Profile stats" })).toContainText("1 post");
    await page.getByRole("link", { name: "A green to violet gradient" }).click();

    // Delete it.
    await expect(page).toHaveURL(/\/p\//);
    await page.getByRole("button", { name: "Post options" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(`/${user.username}`);
    await expect(page.getByText("Post deleted")).toBeVisible();
    await expect(page.getByRole("list", { name: "Profile stats" })).toContainText("0 posts");
    await expect(page.getByText("Share your first photo")).toBeVisible();
  });

  test("rejects files that aren't photos", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/create");
    await pickPhoto(page, {
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello"),
    });
    await expect(page.getByText("Please choose a JPEG, PNG, WebP or GIF image.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose from your device" })).toBeVisible();
  });

  test("only the author gets the edit and delete menu", async ({ page }) => {
    const author = await createConfirmedUser();
    const postId = await createPostFor(page, author.username, "Not yours to edit");

    // Signed out: the post is public, without a menu.
    await page.goto(`/p/${postId}`);
    await expect(page.getByRole("article").getByText("Not yours to edit")).toBeVisible();
    await expect(page.getByRole("button", { name: "Post options" })).toBeHidden();

    // Signed in as someone else: still no menu.
    await signUpAndLogIn(page);
    await page.goto(`/p/${postId}`);
    await expect(page.getByRole("article").getByText("Not yours to edit")).toBeVisible();
    await expect(page.getByRole("button", { name: "Post options" })).toBeHidden();
  });

  test("unknown posts show the not-found page", async ({ page }) => {
    for (const id of [randomUUID(), "not-a-uuid"]) {
      await page.goto(`/p/${id}`);
      await expect(page.getByRole("heading", { name: "This page took a day off" })).toBeVisible();
    }
  });
});

test.describe("accessibility", () => {
  // Same rule set as the profile pages.
  const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
  const axe = (page: Page) => new AxeBuilder({ page }).withTags(WCAG);

  test("the post page has no detectable WCAG 2.2 AA violations", async ({ page }) => {
    const author = await createConfirmedUser();
    const postId = await createPostFor(page, author.username, "Checking contrast");
    await page.goto(`/p/${postId}`);
    await expect(page.getByRole("article").getByText("Checking contrast")).toBeVisible();
    expect((await axe(page).analyze()).violations).toEqual([]);
  });

  test("the new post page has no detectable WCAG 2.2 AA violations", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/create");
    await expect(page.getByRole("button", { name: "Choose from your device" })).toBeVisible();
    expect((await axe(page).analyze()).violations).toEqual([]);
  });
});
