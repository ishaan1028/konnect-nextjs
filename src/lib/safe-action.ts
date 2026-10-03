import "server-only";

import { createSafeActionClient, returnServerError } from "next-safe-action";
import { z } from "zod";

import { getSessionUser } from "@/lib/dal";

/**
 * Every Server Action is built from these clients, so they all get:
 * - input validation with the same Zod schema the form uses (the server never
 *   trusts the client), with typed field errors sent back to the form;
 * - consistent error handling: expected failures (wrong password, rate limit)
 *   are returned with `returnServerError("...")`, while unexpected ones are
 *   logged on the server and replaced with a generic message, so stack traces
 *   and database details never reach the browser.
 */
export const actionClient = createSafeActionClient({
  defineMetadataSchema: () => z.object({ actionName: z.string() }),
  handleServerError(error, { metadata }) {
    console.error(`[action:${metadata?.actionName ?? "unknown"}]`, error);
    return "Something went wrong. Please try again.";
  },
});

/**
 * For actions that require a signed-in user. The user comes from a verified
 * JWT (via the DAL), never from the client's input, and arrives as `ctx.user`.
 */
export const authActionClient = actionClient.use(async ({ next }) => {
  const user = await getSessionUser();
  if (!user) returnServerError("Your session has expired. Please log in again.");
  return next({ ctx: { user } });
});
