import { expect, test } from "@playwright/test";

import { signUpAndLogIn } from "./support/auth";
import { follow } from "./support/follows";
import { createPostFor } from "./support/posts";
import { createConfirmedUser } from "./support/users";

test.describe("saved posts", () => {
  test("save from the feed, see it everywhere, unsave from Saved", async ({ page }) => {
    const author = await createConfirmedUser();
    const viewer = await signUpAndLogIn(page);
    await follow(viewer.username, author.username);
    const postId = await createPostFor(page, author.username, "Save me for later");

    await page.goto("/saved");
    await expect(page.getByText("Nothing saved yet")).toBeVisible();

    // Save it from its feed card (optimistic: the bookmark fills at once).
    await page.goto("/");
    const card = page.getByRole("article", { name: `Post by @${author.username}` });
    const save = card.getByRole("button", { name: "Save" });
    await expect(save).toHaveAttribute("aria-pressed", "false");
    await save.click();
    await expect(save).toHaveAttribute("aria-pressed", "true");

    // The post's own page agrees (it was really saved).
    await page.goto(`/p/${postId}`);
    await expect(page.getByRole("button", { name: "Save" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // It's on the Saved page; unsave it from the post's modal and it's gone.
    await page.goto("/saved");
    await page.locator(`a[href="/p/${postId}"]`).click();
    const modal = page.getByRole("dialog");
    await modal.getByRole("button", { name: "Save" }).click();
    await expect(modal.getByRole("button", { name: "Save" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByText("Nothing saved yet")).toBeVisible();
  });

  test("signed-out visitors are asked to log in to save", async ({ page }) => {
    const author = await createConfirmedUser();
    const postId = await createPostFor(page, author.username, "Public post");
    await page.goto(`/p/${postId}`);
    await page.getByRole("link", { name: "Log in to save" }).click();
    await expect(page).toHaveURL(`/login?next=%2Fp%2F${postId}`);
  });
});
