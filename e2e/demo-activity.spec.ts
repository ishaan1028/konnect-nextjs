import { expect, type APIRequestContext, test } from "@playwright/test";

import { JOB_COMMENTS, REPLIES } from "../src/features/demo/lines";
import { createPostFor } from "./support/posts";
import { adminClient } from "./support/users";

const JOB = "/api/cron/demo-activity";

/** One run with every chance-based action forced (`?act=all`). */
async function runJob(request: APIRequestContext) {
  const response = await request.get(`${JOB}?act=all`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as { done: string[] };
}

async function profileId(username: string) {
  const { data } = await adminClient()
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single()
    .throwOnError();
  return data.id;
}

// The job acts on the shared demo account, so these tests take turns.
test.describe.configure({ mode: "serial" });

test.describe("demo activity job", () => {
  test("refuses requests without the cron secret", async ({ request }) => {
    expect((await request.get(JOB)).status()).toBe(401);
    const wrong = await request.get(JOB, { headers: { authorization: "Bearer not-the-secret" } });
    expect(wrong.status()).toBe(401);
  });

  test("gives the demo account likes and comments, without anyone repeating themselves", async ({
    request,
  }) => {
    const admin = adminClient();
    const demoId = await profileId("dario.altman");
    const startedAt = new Date(Date.now() - 1000).toISOString();

    for (let run = 0; run < 3; run++) await runJob(request);

    // The app's own triggers turned them into notifications for the demo.
    const { data: notifications } = await admin
      .from("notifications")
      .select("type")
      .eq("recipient_id", demoId)
      .gte("created_at", startedAt)
      .throwOnError();
    expect(notifications.map((n) => n.type)).toEqual(expect.arrayContaining(["like", "comment"]));

    const { data: comments } = await admin
      .from("comments")
      .select("author_id, body")
      .gte("created_at", startedAt)
      .throwOnError();
    const said = comments.map((c) => `${c.author_id} ${c.body}`);
    expect(new Set(said).size).toBe(said.length);
    for (const { body } of comments) expect(JOB_COMMENTS).toContain(body);
  });

  test("answers Dario's messages, after marking them seen", async ({ request }) => {
    const admin = adminClient();
    const [demoId, mayaId] = await Promise.all([profileId("dario.altman"), profileId("maya.k")]);
    const { data: chat } = await admin
      .from("conversations")
      .select("id")
      .eq("dm_key", [demoId, mayaId].sort().join(":"))
      .single()
      .throwOnError();
    const { data: sent } = await admin
      .from("messages")
      .insert({ conversation_id: chat.id, sender_id: demoId, body: "Are you free on Friday?" })
      .select("id, created_at")
      .single()
      .throwOnError();

    try {
      const { done } = await runJob(request);
      expect(done).toContain("maya.k replied");

      const { data: reply } = await admin
        .from("messages")
        .select("body, created_at")
        .eq("conversation_id", chat.id)
        .eq("sender_id", mayaId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
        .throwOnError();
      expect(REPLIES).toContain(reply.body);
      expect(new Date(reply.created_at).getTime()).toBeGreaterThan(
        new Date(sent.created_at).getTime(),
      );

      const { data: maya } = await admin
        .from("conversation_participants")
        .select("last_read_at")
        .match({ conversation_id: chat.id, user_id: mayaId })
        .single()
        .throwOnError();
      expect(new Date(maya.last_read_at!).getTime()).toBeGreaterThanOrEqual(
        new Date(sent.created_at).getTime(),
      );
    } finally {
      // Dario's test message stays out of the shared demo chat.
      await admin.from("messages").delete().eq("id", sent.id).throwOnError();
    }
  });

  test("welcomes a new post with a like and a comment", async ({ page, request }) => {
    const admin = adminClient();
    const peopleIds = await Promise.all(
      ["maya.k", "arjun.codes", "zoe.travels", "leo.bakes", "sana.draws"].map(profileId),
    );
    const postId = await createPostFor(page, "dario.altman", "Testing the welcome");
    try {
      await runJob(request);
      const { count: likes } = await admin
        .from("post_likes")
        .select("user_id", { count: "exact", head: true })
        .eq("post_id", postId)
        .in("user_id", peopleIds)
        .throwOnError();
      expect(likes).toBeGreaterThanOrEqual(1);
      const { count: comments } = await admin
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("post_id", postId)
        .in("author_id", peopleIds)
        .throwOnError();
      expect(comments).toBeGreaterThanOrEqual(1);
    } finally {
      // It's the shared demo account: don't leave the test post behind.
      const { data: deleted } = await admin
        .from("posts")
        .delete()
        .eq("id", postId)
        .select("image_path")
        .single()
        .throwOnError();
      await admin.storage.from("posts").remove([deleted.image_path]);
    }
  });
});
