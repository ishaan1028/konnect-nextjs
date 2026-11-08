import { timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";

import { runDemoActivity } from "@/features/demo/server/demo-activity";
import { env } from "@/lib/env";

/**
 * Called once a day by Vercel Cron (vercel.json), which sends
 * "Authorization: Bearer <CRON_SECRET>". Anyone else gets a 401: the job
 * writes as other people with the admin client.
 */
export async function GET() {
  const authorization = (await headers()).get("authorization") ?? "";
  if (!env.CRON_SECRET || !sameText(authorization, `Bearer ${env.CRON_SECRET}`)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await runDemoActivity());
}

/** Constant-time comparison, so response timing doesn't leak the secret. */
function sameText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
