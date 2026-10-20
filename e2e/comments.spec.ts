import { expect, type Page, test } from "@playwright/test";

import { signUpAndLogIn } from "./support/auth";
import { follow } from "./support/follows";
import { createCommentFor, createPostFor } from "./support/posts";
import { createConfirmedUser } from "./support/users";

const comment = (page: Page, username: string) =>
  page.getByRole("article", { name: `Comment by @${username}` });

test.describe("comments", () => {
  test("write, keep and delete a comment on a post", async ({ page }) => {
    const author = await createConfirmedUser();
    const viewer = await signUpAndLogIn(page);
    const postId = await createPostFor(page, author.username, "Talk to me");
    await page.goto(`/p/${postId}`);
    await expect(page.getByText("No comments yet. Start the conversation.")).toBeVisible();

    // The comment button focuses the box; blank comments can't be posted.
    await page.getByRole("button", { name: "Comment", exact: true }).click();
    const box = page.getByRole("textbox", { name: "Add a comment" });
    await expect(box).toBeFocused();
    await expect(page.getByRole("button", { name: "Post", exact: true })).toBeDisabled();

    // Shift+Enter adds a line; Enter posts.
    await box.fill("Hello");
    await box.press("Shift+Enter");
    await box.pressSequentially("there");
    await box.press("Enter");
    const mine = comment(page, viewer.username);
    await expect(mine).toContainText("Hello\nthere");
    await expect(box).toHaveValue("");
    await expect(box).toBeFocused();
    // Wait for the save to finish (a reload would cancel it).
    await expect(mine).not.toHaveAttribute("aria-busy");

    // Saved for real.
    await page.reload();
    await expect(comment(page, viewer.username)).toContainText("Hello");

    // Delete it (with a confirmation).
    await comment(page, viewer.username).getByRole("button", { name: "Delete comment" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(comment(page, viewer.username)).toBeHidden();
    await page.reload();
    await expect(page.getByText("No comments yet. Start the conversation.")).toBeVisible();
  });

  test("the post's owner can delete anyone's comment; others can't", async ({ page }) => {
    const commenter = await createConfirmedUser();
    const owner = await signUpAndLogIn(page);
    const postId = await createPostFor(page, owner.username, "My post");
    await createCommentFor(postId, commenter.username, "Nice one");

    // A bystander sees the comment but can't delete it.
    const bystander = await page.context().browser()!.newContext();
    const other = await bystander.newPage();
    await signUpAndLogIn(other);
    await other.goto(`/p/${postId}`);
    await expect(comment(other, commenter.username)).toContainText("Nice one");
    await expect(
      comment(other, commenter.username).getByRole("button", { name: "Delete comment" }),
    ).toHaveCount(0);
    await bystander.close();

    // The owner can.
    await page.goto(`/p/${postId}`);
    await comment(page, commenter.username).getByRole("button", { name: "Delete comment" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(comment(page, commenter.username)).toBeHidden();
  });

  test("feed cards show the latest comments and stay in sync with the thread", async ({ page }) => {
    const author = await createConfirmedUser();
    const viewer = await signUpAndLogIn(page);
    const postId = await createPostFor(page, author.username, "Feed post");
    for (const body of ["One", "Two", "Three"]) {
      await createCommentFor(postId, author.username, body);
    }
    await follow(viewer.username, author.username);
    await page.reload();

    const card = page.getByRole("article", { name: `Post by @${author.username}` });
    await expect(card.getByRole("link", { name: "View all 3 comments" })).toBeVisible();
    await expect(card.getByText("Three")).toBeVisible();
    await expect(card.getByText("One", { exact: true })).toBeHidden();

    // Comment from the card: the comment button focuses the card's own box.
    await card.getByRole("button", { name: "Comment", exact: true }).click();
    const box = card.getByRole("textbox", { name: "Add a comment" });
    await expect(box).toBeFocused();
    await box.fill("From the feed");
    await box.press("Enter");
    await expect(card.getByText("From the feed")).toBeVisible();
    await expect(card.getByRole("link", { name: "View all 4 comments" })).toBeVisible();

    // The thread (in the modal) has it at the top.
    await card.getByRole("link", { name: "View all 4 comments" }).click();
    const modal = page.getByRole("dialog", { name: "Post" });
    await expect(modal.getByRole("article", { name: /^Comment by/ }).first()).toContainText(
      "From the feed",
    );
  });

  test("signed-out visitors can read comments and are asked to log in", async ({ page }) => {
    const author = await createConfirmedUser();
    const postId = await createPostFor(page, author.username, "Public thread");
    await createCommentFor(postId, author.username, "Anyone can read this");

    await page.goto(`/p/${postId}`);
    await expect(comment(page, author.username)).toContainText("Anyone can read this");
    const post = page.getByRole("article", { name: `Post by @${author.username}` });
    await expect(post.getByRole("link", { name: "Log in", exact: true })).toHaveAttribute(
      "href",
      `/login?next=%2Fp%2F${postId}`,
    );
    await expect(page.getByRole("textbox", { name: "Add a comment" })).toHaveCount(0);
  });
});
