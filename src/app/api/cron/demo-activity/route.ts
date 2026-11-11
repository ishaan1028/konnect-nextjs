import { timingSafeEqual } from "node:crypto";

import { runDemoActivity } from "@/features/demo/server/demo-activity";
import { env } from "@/lib/env";

/**
 * Called every 15 minutes by Vercel Schedules (vercel.json), which sends
 * "Authorization: Bearer <CRON_SECRET>". Anyone else gets a 401: the job
 * writes as other people with the admin client. `?act=all` makes every action
 * happen at once, for tests and manual checks.
 */
export async function GET(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!env.CRON_SECRET || !sameText(authorization, `Bearer ${env.CRON_SECRET}`)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const actAll = new URL(request.url).searchParams.get("act") === "all";
  return Response.json(await runDemoActivity({ actAll }));
}

/** Constant-time comparison, so response timing doesn't leak the secret. */
function sameText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
