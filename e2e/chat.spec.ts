import { type Browser, expect, type Page, test } from "@playwright/test";

import { logIn } from "./support/auth";
import { follow } from "./support/follows";
import { adminClient, createConfirmedUser } from "./support/users";

/** A separate browser (its own cookies), signed in as `user`. */
async function openBrowserAs(browser: Browser, user: { email: string; password: string }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await logIn(page, user.email, user.password);
  await expect(page).toHaveURL("/");
  return page;
}

const thread = (page: Page) => page.getByRole("log", { name: "Messages" });
const composer = (page: Page) => page.getByRole("textbox", { name: "Message", exact: true });

test.describe("chat", () => {
  test("two people chat in real time", async ({ browser }) => {
    const alice = await createConfirmedUser();
    const bob = await createConfirmedUser();
    await follow(alice.username, bob.username);

    // Alice starts the chat from "New message".
    const alicePage = await openBrowserAs(browser, alice);
    await alicePage.goto("/messages");
    await alicePage.getByRole("button", { name: "New message" }).click();
    await alicePage.getByRole("button", { name: new RegExp(bob.username) }).click();
    await expect(alicePage).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
    const chatUrl = alicePage.url();

    await composer(alicePage).fill("Hi Bob!");
    await composer(alicePage).press("Enter");
    await expect(thread(alicePage).getByText("Hi Bob!")).toBeVisible();

    // Enough history that the thread scrolls (set up directly).
    const conversationId = chatUrl.split("/").at(-1)!;
    const { data: sender } = await adminClient()
      .from("profiles")
      .select("id")
      .eq("username", alice.username)
      .single()
      .throwOnError();
    for (let i = 1; i <= 20; i++) {
      await adminClient()
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: sender.id, body: `Filler ${i}` })
        .throwOnError();
    }
    await expect(thread(alicePage).getByText("Filler 20")).toBeInViewport();

    // Bob sees an unread chat (badge and inbox), then opens it.
    const bobPage = await openBrowserAs(browser, bob);
    await expect(bobPage.getByText("1 unread chat").first()).toBeAttached();
    await bobPage.goto("/messages");
    await bobPage.getByRole("link", { name: new RegExp(alice.username) }).click();
    await expect(thread(bobPage).getByText("Hi Bob!")).toBeVisible();

    // Alice sees "Seen" once Bob has read it, without reloading.
    await expect(alicePage.getByText("Seen")).toBeVisible();
    // The optimistic message and its realtime echo are one bubble, not two.
    await expect(thread(alicePage).getByText("Hi Bob!")).toHaveCount(1);

    // Bob types (Alice sees it), then replies; it arrives live.
    await composer(bobPage).pressSequentially("Hey Alice", { delay: 20 });
    // Shown at the bottom without scrolling down to it.
    await expect(alicePage.getByText(`${bob.username} is typing…`)).toBeInViewport();
    await composer(bobPage).press("Enter");
    await expect(thread(alicePage).getByText("Hey Alice")).toBeVisible();

    // The inbox row keeps up with the thread, even for quick consecutive sends.
    for (const text of ["one", "two", "three"]) {
      await composer(alicePage).fill(text);
      await composer(alicePage).press("Enter");
    }
    await expect(alicePage.getByRole("list", { name: "Chats" })).toContainText("You: three");

    // A refresh keeps the history.
    await alicePage.reload();
    await expect(thread(alicePage).getByText("Hi Bob!")).toBeVisible();
    await expect(thread(alicePage).getByText("Hey Alice")).toBeVisible();

    // Shift+Enter adds a line instead of sending; blank messages can't be sent.
    await composer(alicePage).fill("line one");
    await composer(alicePage).press("Shift+Enter");
    await composer(alicePage).pressSequentially("line two");
    await composer(alicePage).press("Enter");
    await expect(thread(alicePage).getByText("line one\nline two")).toBeVisible();
    await expect(alicePage.getByRole("button", { name: "Send" })).toBeDisabled();

    // Someone else can't open their chat.
    const eve = await createConfirmedUser();
    const evePage = await openBrowserAs(browser, eve);
    await evePage.goto(chatUrl);
    await expect(evePage.getByText("This chat isn't available.")).toBeVisible();
    await expect(thread(evePage)).toHaveCount(0);
  });

  test("you can only start chats with people you follow", async ({ browser }) => {
    const stranger = await createConfirmedUser();
    const me = await createConfirmedUser();
    const page = await openBrowserAs(browser, me);
    await page.goto("/messages");
    await page.getByRole("button", { name: "New message" }).click();
    await expect(page.getByText("Follow people to message them.")).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(stranger.username) })).toHaveCount(0);
  });
});
