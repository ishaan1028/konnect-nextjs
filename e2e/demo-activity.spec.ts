import { expect, test } from "@playwright/test";

import { adminClient } from "./support/users";

const JOB = "/api/cron/demo-activity";

test.describe("daily demo activity job", () => {
  test("refuses requests without the cron secret", async ({ request }) => {
    expect((await request.get(JOB)).status()).toBe(401);
    const wrong = await request.get(JOB, { headers: { authorization: "Bearer not-the-secret" } });
    expect(wrong.status()).toBe(401);
  });

  test("gives the demo account a like, a comment and a message", async ({ request }) => {
    const admin = adminClient();
    const { data: demo } = await admin
      .from("profiles")
      .select("id")
      .eq("username", "dario.altman")
      .single()
      .throwOnError();
    const startedAt = new Date(Date.now() - 1000).toISOString();

    const response = await request.get(JOB, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(response.status()).toBe(200);
    const { done } = await response.json();
    expect(done).toEqual(expect.arrayContaining([expect.stringMatching(/sent a message$/)]));

    // The app's own triggers turned them into notifications for the demo.
    const { data: notifications } = await admin
      .from("notifications")
      .select("type")
      .eq("recipient_id", demo.id)
      .gte("created_at", startedAt)
      .throwOnError();
    expect(notifications.map((n) => n.type)).toEqual(expect.arrayContaining(["like", "comment"]));

    const { data: chats } = await admin
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", demo.id)
      .throwOnError();
    const { count } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in(
        "conversation_id",
        chats.map((chat) => chat.conversation_id),
      )
      .neq("sender_id", demo.id)
      .gte("created_at", startedAt)
      .throwOnError();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
