import { expect, type Page, test } from "@playwright/test";

import { logIn } from "./support/auth";
import { adminClient, createConfirmedUser } from "./support/users";

async function signUpAndLogIn(page: Page) {
  const user = await createConfirmedUser();
  await page.goto("/login");
  await logIn(page, user.email, user.password);
  await expect(page).toHaveURL("/");
  return user;
}

const stat = (page: Page, label: "followers" | "following") =>
  page
    .getByRole("list", { name: "Profile stats" })
    .getByRole("listitem")
    // "1 follower" / "2 followers": match either form.
    .filter({ hasText: label === "followers" ? /\bfollowers?\b/ : /\bfollowing\b/ });

test.describe("following", () => {
  test("follow and unfollow from a profile, with counts updating", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/leo.bakes");

    const followers = stat(page, "followers");
    const before = Number((await followers.innerText()).match(/\d+/)?.[0]);

    const follow = page.getByRole("button", { name: "Follow @leo.bakes" });
    await follow.click();
    // Optimistic: the button flips immediately; the cached count refreshes via updateTag.
    await expect(page.getByRole("button", { name: "Following @leo.bakes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(followers).toContainText(String(before + 1));

    // Survives a reload: it was really saved.
    await page.reload();
    await expect(page.getByRole("button", { name: "Following @leo.bakes" })).toBeVisible();

    await page.getByRole("button", { name: "Following @leo.bakes" }).click();
    await expect(page.getByRole("button", { name: "Follow @leo.bakes" })).toBeVisible();
    await expect(followers).toContainText(String(before));
  });

  test("signed-out visitors are sent to log in, then back to the profile", async ({ page }) => {
    await page.goto("/leo.bakes");
    // exact: a substring match would also hit the "Followers"/"Following" stat links.
    await page.getByRole("link", { name: "Follow", exact: true }).click();
    await expect(page).toHaveURL("/login?next=%2Fleo.bakes");
  });

  test("suggests people to follow on the home page", async ({ page }) => {
    await signUpAndLogIn(page);
    const suggestions = page.getByRole("complementary", { name: "Suggested for you" });
    await expect(suggestions.getByRole("listitem").first()).toBeVisible();

    const firstFollow = suggestions.getByRole("button", { name: /^Follow @/ }).first();
    const name = (await firstFollow.getAttribute("aria-label"))!.replace("Follow ", "");
    await firstFollow.click();
    await expect(suggestions.getByRole("button", { name: `Following ${name}` })).toBeVisible();
  });

  test("shows Follow back from the first paint for people who follow you", async ({ page }) => {
    // The top suggestion for a brand-new account follows them before they log in.
    const user = await createConfirmedUser();
    const admin = adminClient();
    const { data: me } = await admin
      .from("profiles")
      .select("id")
      .eq("username", user.username)
      .single()
      .throwOnError();
    const { data: fan } = await admin
      .from("profiles")
      .select("id, username")
      .neq("id", me.id)
      .order("followers_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .throwOnError();
    await admin.from("follows").insert({ follower_id: fan.id, following_id: me.id }).throwOnError();

    await page.goto("/login");
    await logIn(page, user.email, user.password);
    await expect(page).toHaveURL("/");

    // Read the label as soon as the row appears: no "Follow" first, no flip later.
    const suggestions = page.getByRole("complementary", { name: "Suggested for you" });
    const suggested = suggestions.getByRole("button", { name: new RegExp(`@${fan.username}$`) });
    await expect(suggested).toBeVisible();
    expect(await suggested.getAttribute("aria-label")).toBe(`Follow back @${fan.username}`);

    // Same in someone else's followers list that includes them.
    const other = await createConfirmedUser();
    const { data: otherProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("username", other.username)
      .single()
      .throwOnError();
    await admin
      .from("follows")
      .insert({ follower_id: fan.id, following_id: otherProfile.id })
      .throwOnError();
    await page.goto(`/${other.username}/followers`);
    const row = page.getByRole("button", { name: new RegExp(`@${fan.username}$`) });
    await expect(row).toBeVisible();
    expect(await row.getAttribute("aria-label")).toBe(`Follow back @${fan.username}`);
  });

  test("the suggestions card keeps its height while loading and after", async ({ page }) => {
    await signUpAndLogIn(page);
    // Record the card's height on every change, from the first paint of a fresh load.
    await page.addInitScript(() => {
      const heights = new Set<number>();
      Object.assign(window, { cardHeights: heights });
      new MutationObserver(() => {
        const card = [...document.querySelectorAll("aside")].find((el) => el.offsetParent);
        if (card) heights.add(card.offsetHeight);
      }).observe(document, { subtree: true, childList: true });
    });
    await page.goto("/");
    const suggestions = page.getByRole("complementary", { name: "Suggested for you" });
    await expect(suggestions.getByRole("listitem").first()).toBeVisible();

    const heights = await page.evaluate(() => [
      ...(window as unknown as { cardHeights: Set<number> }).cardHeights,
    ]);
    expect(heights).toHaveLength(1);
  });
});

test.describe("followers and following lists", () => {
  test("open as a modal over the profile, and as a full page when loaded directly", async ({
    page,
  }) => {
    await signUpAndLogIn(page);
    await page.goto("/alex.demo");

    // Soft navigation: intercepted route → modal, URL updates.
    await stat(page, "followers").getByRole("link").click();
    const modal = page.getByRole("dialog", { name: "Followers" });
    await expect(modal).toBeVisible();
    await expect(page).toHaveURL("/alex.demo/followers");
    await expect(modal.getByRole("link", { name: /maya\.k/ })).toBeVisible();
    // The profile is still rendered underneath, but the open dialog makes it
    // inert, so assistive tech only sees the dialog (correct modal behaviour).
    await expect(page.locator("h1", { hasText: "@alex.demo" })).toBeAttached();
    await expect(page.getByRole("heading", { name: "@alex.demo" })).toHaveCount(0);

    // Closing goes back in history.
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL("/alex.demo");

    // Hard load: the same URL renders the full page.
    await page.goto("/alex.demo/followers");
    await expect(page.getByRole("heading", { level: 1, name: "Followers" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("the modal opens every time, including reopening the same list", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/alex.demo");

    // Regression: with Cache Components, a revisited route is restored with its
    // old state, so a dialog that remembered "closed" stayed shut on reopen.
    for (const kind of ["followers", "followers", "following", "followers"] as const) {
      await stat(page, kind).getByRole("link").click();
      const modal = page.getByRole("dialog", {
        name: kind === "followers" ? "Followers" : "Following",
      });
      await expect(modal).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(modal).toBeHidden();
      await expect(page).toHaveURL("/alex.demo");
    }
  });

  test("reopening a list shows the cached people at once, without a skeleton", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/alex.demo");
    const modal = page.getByRole("dialog", { name: "Followers" });

    await stat(page, "followers").getByRole("link").click();
    await expect(modal.getByRole("listitem").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();

    // Record whether a loading skeleton ever appears in a dialog on the reopen.
    await page.evaluate(() => {
      new MutationObserver(() => {
        if (document.querySelector('[role="dialog"] [data-slot="skeleton"]')) {
          document.body.dataset.sawSkeleton = "true";
        }
      }).observe(document.body, { subtree: true, childList: true });
    });
    await stat(page, "followers").getByRole("link").click();
    await expect(modal.getByRole("listitem").first()).toBeVisible();
    await expect(page.locator("body")).not.toHaveAttribute("data-saw-skeleton");
  });

  test("the modal keeps one size, and a long list scrolls inside it", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/alex.demo");

    // alex.demo has more followers than fit, and only a few people they follow.
    const heights = [];
    for (const kind of ["followers", "following"] as const) {
      await stat(page, kind).getByRole("link").click();
      const modal = page.getByRole("dialog");
      await expect(modal.getByRole("listitem").first()).toBeVisible();
      heights.push((await modal.boundingBox())?.height);
      if (kind === "followers") {
        const list = modal.locator(".overflow-y-auto");
        expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      }
      await page.keyboard.press("Escape");
      await expect(modal).toBeHidden();
    }
    expect(heights[0]).toBeGreaterThan(0);
    expect(heights[1]).toBe(heights[0]);
  });

  test("tapping a person in the modal opens their profile and closes the modal", async ({
    page,
  }) => {
    await signUpAndLogIn(page);
    await page.goto("/alex.demo");
    await stat(page, "followers").getByRole("link").click();
    await page
      .getByRole("dialog", { name: "Followers" })
      .getByRole("link", { name: /maya\.k/ })
      .click();

    await expect(page).toHaveURL("/maya.k");
    await expect(page.getByRole("heading", { name: "@maya.k" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("you can remove someone from your followers", async ({ page, browser }) => {
    const owner = await signUpAndLogIn(page);

    // A second person follows the owner, in a separate browser session.
    const fan = await createConfirmedUser();
    const fanContext = await browser.newContext();
    const fanPage = await fanContext.newPage();
    await fanPage.goto("/login");
    await logIn(fanPage, fan.email, fan.password);
    await expect(fanPage).toHaveURL("/");
    await fanPage.goto(`/${owner.username}`);
    await fanPage.getByRole("button", { name: `Follow @${owner.username}` }).click();
    await expect(
      fanPage.getByRole("button", { name: `Following @${owner.username}` }),
    ).toBeVisible();
    await fanContext.close();

    await page.goto(`/${owner.username}/followers`);
    await page.getByRole("button", { name: `Remove @${fan.username} from your followers` }).click();
    await page
      .getByRole("alertdialog", { name: "Remove follower?" })
      .getByRole("button", { name: "Remove" })
      .click();

    await expect(page.getByText("Follower removed")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(fan.username) })).toHaveCount(0);
  });
});
