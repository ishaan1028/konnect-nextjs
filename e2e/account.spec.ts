import { expect, test } from "@playwright/test";

import { logIn, logOut, signUpAndLogIn } from "./support/auth";
import { follow } from "./support/follows";
import { makePng } from "./support/images";
import { createPostFor } from "./support/posts";
import { adminClient, createConfirmedUser } from "./support/users";

test.describe("account settings", () => {
  test("change your password with your current one", async ({ page }) => {
    const user = await signUpAndLogIn(page);
    await page.goto("/settings/account");

    await page.getByLabel("Current password").fill("not-my-password1");
    await page.getByLabel("New password", { exact: true }).fill("brand-new-pass1");
    await page.getByLabel("Confirm new password").fill("brand-new-pass1");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("That's not your current password")).toBeVisible();

    await page.getByLabel("Current password").fill(user.password);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Password changed")).toBeVisible();
    await expect(page.getByLabel("Current password")).toHaveValue("");

    // The new password is the one that works now.
    await logOut(page);
    await logIn(page, user.email, "brand-new-pass1");
    await expect(page).toHaveURL("/");
  });

  test("the demo account can't change its password or delete itself", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Continue as demo user" }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/settings/account");

    await expect(page.getByText("This is the shared demo account")).toBeVisible();
    await expect(
      page.getByText("Its password can't be changed and the account can't be deleted"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Change password" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Delete account" })).toBeDisabled();
  });

  test("delete your account: everything goes, chats stay from a Deleted user", async ({ page }) => {
    const user = await signUpAndLogIn(page);
    const friend = await createConfirmedUser();
    const admin = adminClient();
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username")
      .in("username", [user.username, friend.username])
      .throwOnError();
    const id = (username: string) => profiles.find((row) => row.username === username)!.id;
    const uid = id(user.username);

    // Things to delete (set up directly): a post (and its photo), an avatar
    // file, follows both ways, and a chat with a message from each of them.
    await createPostFor(page, user.username, "Goodbye post");
    await admin.storage
      .from("avatars")
      .upload(`${uid}/avatar.png`, await makePng(page), { contentType: "image/png" });
    await follow(user.username, friend.username);
    await follow(friend.username, user.username);
    const { data: chat } = await admin
      .from("conversations")
      .insert({ dm_key: [uid, id(friend.username)].sort().join(":") })
      .select("id")
      .single()
      .throwOnError();
    await admin
      .from("conversation_participants")
      .insert([
        { conversation_id: chat.id, user_id: uid },
        { conversation_id: chat.id, user_id: id(friend.username) },
      ])
      .throwOnError();
    await admin
      .from("messages")
      .insert([
        { conversation_id: chat.id, sender_id: id(friend.username), body: "Hey there" },
        { conversation_id: chat.id, sender_id: uid, body: "Bye for now" },
      ])
      .throwOnError();

    await page.goto("/settings/account");
    await page.getByRole("button", { name: "Delete account" }).click();
    const dialog = page.getByRole("alertdialog", { name: "Delete your account?" });
    const confirm = dialog.getByRole("button", { name: "Delete account" });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(`Type ${user.username} to confirm`).fill(user.username);
    await confirm.click();

    await expect(page).toHaveURL("/login");
    await expect(page.getByText("Your account was deleted")).toBeVisible();

    // Nothing with their id is left: rows, files or the auth user.
    const count = async (table: string, column: string) => {
      const { count: rows } = await admin
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq(column, uid)
        .throwOnError();
      return rows;
    };
    expect(await count("profiles", "id")).toBe(0);
    expect(await count("posts", "author_id")).toBe(0);
    expect(await count("follows", "follower_id")).toBe(0);
    expect(await count("follows", "following_id")).toBe(0);
    expect(await count("conversation_participants", "user_id")).toBe(0);
    expect(await count("messages", "sender_id")).toBe(0);
    for (const bucket of ["avatars", "posts"]) {
      const { data: files } = await admin.storage.from(bucket).list(uid);
      expect(files).toEqual([]);
    }
    const { error } = await admin.auth.admin.getUserById(uid);
    expect(error?.status).toBe(404);

    // Their profile is gone (not served from a cached page).
    await page.goto(`/${user.username}`);
    await expect(page.getByRole("heading", { name: "This page took a day off" })).toBeVisible();

    // The friend still has the chat, from a "Deleted user" they can't reply to.
    await page.goto("/login");
    await logIn(page, friend.email, friend.password);
    await expect(page).toHaveURL("/");
    await page.goto("/messages");
    await page.getByRole("link", { name: /Deleted user/ }).click();
    const thread = page.getByRole("log", { name: "Messages" });
    await expect(thread.getByText("Hey there")).toBeVisible();
    await expect(thread.getByText("Bye for now")).toBeVisible();
    await expect(page.getByText("You can't reply to this conversation.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveCount(0);
  });
});
