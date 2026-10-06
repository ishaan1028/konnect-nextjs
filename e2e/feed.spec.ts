import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { signUpAndLogIn } from "./support/auth";
import { follow } from "./support/follows";
import { createPostFor } from "./support/posts";
import { adminClient, createConfirmedUser } from "./support/users";

const card = (page: Page, username: string) =>
  page.getByRole("article", { name: `Post by @${username}` });

test.describe("home feed", () => {
  test("shows followed people's posts; likes stay in sync everywhere", async ({ page }) => {
    const author = await createConfirmedUser();
    const viewer = await signUpAndLogIn(page);
    await createPostFor(page, author.username, "Hello from the feed");
    await follow(viewer.username, author.username);
    await page.reload();

    const post = card(page, author.username);
    await expect(post.getByText("Hello from the feed")).toBeVisible();
    await expect(post.getByText("Be the first to like this")).toBeVisible();

    // Like: the heart turns on and the count appears at once.
    const like = post.getByRole("button", { name: "Like", exact: true });
    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "true");
    await post.getByRole("button", { name: "1 like" }).click();
    const likes = page.getByRole("dialog", { name: "Likes" });
    await expect(likes.getByText(viewer.username)).toBeVisible();
    await page.keyboard.press("Escape");

    // Saved for real: still liked after a reload.
    await page.reload();
    await expect(
      card(page, author.username).getByRole("button", { name: "Like", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    // The post opens as a modal over the feed, with the same like state.
    await card(page, author.username).getByRole("link", { name: "Comment" }).click();
    const modal = page.getByRole("dialog", { name: "Post" });
    await expect(modal.getByText("Hello from the feed")).toBeVisible();
    await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
    const modalLike = modal.getByRole("button", { name: "Like", exact: true });
    await expect(modalLike).toHaveAttribute("aria-pressed", "true");

    // Unlike in the modal; the feed behind it agrees once it closes.
    await modalLike.click();
    await expect(modalLike).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL("/");
    await expect(card(page, author.username).getByText("Be the first to like this")).toBeVisible();
  });

  test("double-tapping a photo likes it", async ({ page }) => {
    const author = await createConfirmedUser();
    const viewer = await signUpAndLogIn(page);
    await createPostFor(page, author.username, "Double tap me");
    await follow(viewer.username, author.username);
    await page.reload();

    const post = card(page, author.username);
    await post.getByRole("img", { name: "A green to violet gradient" }).dblclick();
    await expect(post.getByRole("button", { name: "Like", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(post.getByRole("button", { name: "1 like" })).toBeVisible();
  });

  test("an empty feed points to Explore", async ({ page }) => {
    await signUpAndLogIn(page);
    await expect(page.getByText("Your feed is waiting")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Feed" }).getByRole("link", { name: "Explore" }),
    ).toHaveAttribute("href", "/explore");
  });

  test("a post opens as a modal from a profile grid, and as a page on reload", async ({ page }) => {
    const author = await createConfirmedUser();
    await signUpAndLogIn(page);
    await createPostFor(page, author.username, "Grid to modal");

    await page.goto(`/${author.username}`);
    await page.getByRole("link", { name: "A green to violet gradient" }).click();
    await expect(
      page.getByRole("dialog", { name: "Post" }).getByText("Grid to modal"),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("article").getByText("Grid to modal")).toBeVisible();
  });

  test("signed-out visitors see the likes but log in to like", async ({ page }) => {
    const author = await createConfirmedUser();
    const postId = await createPostFor(page, author.username, "Public post");

    await page.goto(`/p/${postId}`);
    await expect(page.getByRole("article").getByText("Public post")).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in to like" })).toHaveAttribute(
      "href",
      `/login?next=%2Fp%2F${postId}`,
    );
  });
});

test.describe("explore", () => {
  test("shows other people's posts, not yours", async ({ page }) => {
    const other = await createConfirmedUser();
    const me = await signUpAndLogIn(page);
    await createPostFor(page, other.username, "Theirs");
    await createPostFor(page, me.username, "Mine");

    await page.goto("/explore");
    const grid = page.getByRole("list").filter({ has: page.locator('a[href^="/p/"]') });
    await expect(
      grid.getByRole("link", { name: "A green to violet gradient" }).first(),
    ).toBeVisible();

    // Neither of my own posts' pages is linked from Explore.
    const { data: mine } = await adminClient()
      .from("posts")
      .select("id, author:profiles!posts_author_id_fkey!inner(username)")
      .eq("author.username", me.username)
      .throwOnError();
    for (const { id } of mine) await expect(page.locator(`a[href="/p/${id}"]`)).toHaveCount(0);
  });

  test("searches people, with the query in the URL", async ({ page }) => {
    const target = await createConfirmedUser();
    await signUpAndLogIn(page);
    await page.goto("/explore");

    await page.getByLabel("Search people").fill(target.username);
    await expect(page).toHaveURL(`/explore?q=${target.username}`);
    const result = page.getByRole("listitem").filter({ hasText: target.username });
    await expect(result).toBeVisible();

    // Follow straight from the results.
    await result.getByRole("button", { name: `Follow @${target.username}` }).click();
    await expect(
      result.getByRole("button", { name: `Following @${target.username}` }),
    ).toBeVisible();

    // A shared/refreshed URL restores the search.
    await page.reload();
    await expect(page.getByLabel("Search people")).toHaveValue(target.username);
    await expect(page.getByRole("listitem").filter({ hasText: target.username })).toBeVisible();

    // Clearing it brings the grid back and drops ?q=.
    await page.getByLabel("Search people").fill("");
    await expect(page).toHaveURL("/explore");
  });

  test("says when nobody matches", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/explore?q=zzzz_nobody_here");
    await expect(page.getByText("No people match “zzzz_nobody_here”.")).toBeVisible();
  });
});

test.describe("accessibility", () => {
  const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

  test("the feed has no detectable WCAG 2.2 AA violations", async ({ page }) => {
    const author = await createConfirmedUser();
    const viewer = await signUpAndLogIn(page);
    await createPostFor(page, author.username, "Accessible post");
    await follow(viewer.username, author.username);
    await page.reload();
    await expect(card(page, author.username)).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(violations).toEqual([]);
  });

  test("Explore has no detectable WCAG 2.2 AA violations", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/explore");
    await expect(page.getByLabel("Search people")).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(violations).toEqual([]);
  });
});
