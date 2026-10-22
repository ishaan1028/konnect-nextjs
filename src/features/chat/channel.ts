"use client";

import type { RealtimeChannel, RealtimeChannelOptions } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

/** Topics whose previous channel is still being removed. */
const leaving = new Map<string, Promise<unknown>>();

/**
 * Joins a private Realtime channel; returns a function that leaves it.
 * `configure` adds the handlers and calls `subscribe()`.
 *
 * supabase.channel() returns the existing channel for a topic until its
 * (async) removal finishes, so a quick remount (StrictMode, coming back to a
 * chat) would get the channel that's being torn down and silently stop
 * receiving. Waiting for the previous removal first avoids that.
 */
export function joinChannel(
  topic: string,
  configure: (channel: RealtimeChannel) => void,
  config?: RealtimeChannelOptions["config"],
) {
  const supabase = createClient();
  let channel: RealtimeChannel | undefined;
  let left = false;

  void (async () => {
    await leaving.get(topic);
    // Private channels need the user's token before joining.
    await supabase.realtime.setAuth();
    if (left) return;
    channel = supabase.channel(topic, { config: { ...config, private: true } });
    configure(channel);
  })();

  return () => {
    left = true;
    if (!channel) return;
    const removal = supabase.removeChannel(channel).catch(() => undefined);
    leaving.set(topic, removal);
    void removal.then(() => {
      if (leaving.get(topic) === removal) leaving.delete(topic);
    });
  };
}
