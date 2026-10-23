"use client";

import { useSyncExternalStore } from "react";

/*
 * Who's online right now, from Realtime Presence (ChatRealtime keeps it up to
 * date). A tiny store rather than React state, so any avatar can read it
 * without the whole app re-rendering.
 */

let online = new Set<string>();
const listeners = new Set<() => void>();

export function setOnlineUsers(ids: Iterable<string>) {
  online = new Set(ids);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether someone is online (false on the server: presence is browser-only). */
export function useIsOnline(userId: string | undefined): boolean {
  return useSyncExternalStore(
    subscribe,
    () => userId !== undefined && online.has(userId),
    () => false,
  );
}
