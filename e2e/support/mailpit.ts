import { expect } from "@playwright/test";

/** Local Supabase sends every email to Mailpit (see `pnpm db:status`). */
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitSearch = { messages: { ID: string; Subject: string }[] };
type MailpitMessage = { HTML: string };

/**
 * Waits for the newest email to `to` whose subject contains `subject`, and
 * returns the first link pointing at our /auth/confirm route.
 */
export async function getEmailLink(to: string, subject: string): Promise<string> {
  let link: string | undefined;

  await expect
    .poll(
      async () => {
        const query = encodeURIComponent(`to:"${to}" subject:"${subject}"`);
        const search = (await (
          await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`)
        ).json()) as MailpitSearch;
        const latest = search.messages[0];
        if (!latest) return undefined;

        const message = (await (
          await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`)
        ).json()) as MailpitMessage;
        link = message.HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/)?.[1]?.replaceAll(
          "&amp;",
          "&",
        );
        return link;
      },
      { message: `waiting for "${subject}" email to ${to}`, timeout: 15_000 },
    )
    .toBeTruthy();

  return link!;
}
