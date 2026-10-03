"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { usernameSchema } from "../schemas";

export type UsernameStatus =
  | { state: "idle" }
  | { state: "checking"; username: string }
  | { state: "available" | "unavailable" | "error"; username: string };

type Result = { username: string; state: "available" | "unavailable" | "error" };

const DEBOUNCE_MS = 400;

/**
 * Live "is this username free?" check while typing.
 *
 * - Only well-formed usernames are checked (the schema runs first, locally).
 * - Debounced, and each new keystroke aborts the previous request, so a slow
 *   response for "may" can never overwrite the result for "maya".
 * - The status is *derived*: we store the last result with the username it
 *   belongs to, and anything that doesn't match is "checking". No setState
 *   during render or synchronously inside the effect.
 * - It's a hint for the user. The Server Action and the database decide.
 */
export function useUsernameAvailability(rawUsername: string): UsernameStatus {
  const parsed = usernameSchema.safeParse(rawUsername);
  const username = parsed.success ? parsed.data : null;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!username) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const { data, error } = await createClient()
        .rpc("is_username_available", { username })
        .abortSignal(controller.signal);

      if (controller.signal.aborted) return;
      setResult({ username, state: error ? "error" : data ? "available" : "unavailable" });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username]);

  if (!username) return { state: "idle" };
  if (result?.username === username) return result;
  return { state: "checking", username };
}
