import { expect, test } from "@playwright/test";

import { signUpAndLogIn } from "./support/auth";
import { follow } from "./support/follows";
import { createCommentFor, createPostFor } from "./support/posts";
import { adminClient, createConfirmedUser } from "./support/users";

test.describe("notifications", () => {
  test("likes, comments and follows arrive live and link to what they're about", async ({
    page,
  }) => {
    const me = await signUpAndLogIn(page);
    const fan = await createConfirmedUser();
    const otherFan = await createConfirmedUser();
    const postId = await createPostFor(page, me.username, "Notice me");
    const { data: fans } = await adminClient()
      .from("profiles")
      .select("id, username")
      .in("username", [fan.username, otherFan.username])
      .throwOnError();
    const idOf = (username: string) => fans.find((row) => row.username === username)!.id;

    // Two fans like the post, one comments and follows (set up directly), while I'm on the feed.
    const bell = page.getByRole("navigation", { name: "Main" }).locator('a[href="/notifications"]');
    await expect(bell).toBeVisible();
    await expect(bell).not.toContainText("new notification");
    for (const username of [fan.username, otherFan.username]) {
      await adminClient()
        .from("post_likes")
        .insert({ post_id: postId, user_id: idOf(username) })
        .throwOnError();
    }
    await createCommentFor(postId, fan.username, "Great shot");
    await follow(fan.username, me.username);

    // The badge counts them without a reload.
    await expect(bell).toContainText("4 new notifications");

    await bell.click();
    await expect(page).toHaveURL("/notifications");
    const list = page.getByRole("main");
    // The two likes are one row, newest first.
    const likes = list.getByRole("link", { name: /liked your post/ });
    await expect(likes).toHaveCount(1);
    await expect(likes).toContainText(`${otherFan.username} and ${fan.username} liked your post.`);
    await expect(list.getByText("commented: “Great shot”")).toBeVisible();
    await expect(list.getByText("started following you.")).toBeVisible();
    await expect(list.getByRole("button", { name: `Follow back @${fan.username}` })).toBeVisible();

    // Opening the page reads them.
    await expect(bell).not.toContainText("new notification");

    // Each one links to what it's about.
    await likes.click();
    await expect(page).toHaveURL(`/p/${postId}`);
  });
});
