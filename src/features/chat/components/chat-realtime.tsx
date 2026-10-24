"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useCurrentUser } from "@/features/profiles/hooks";
import { queryKeys } from "@/lib/query/keys";
import { joinChannel } from "../channel";
import { setOnlineUsers } from "../presence";

/**
 * App-wide chat updates, mounted once per signed-in session:
 * - `user:<id>` (only you can listen): a ping whenever one of your chats gets
 *   a message or is read, or you get a notification, so the inbox and the
 *   badges refresh;
 * - `online` (signed-in users): Presence, for the green "online" dots.
 * Renders nothing. Render inside a CurrentUserBoundary.
 */
export function ChatRealtime() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    const leaveInbox = joinChannel(`user:${userId}`, (channel) =>
      channel
        .on("broadcast", { event: "inbox" }, () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.chat.inbox });
          void queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadCount });
        })
        .on("broadcast", { event: "notification" }, () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        })
        .subscribe(),
    );
    const leavePresence = joinChannel(
      "online",
      (channel) =>
        channel
          .on("presence", { event: "sync" }, () =>
            setOnlineUsers(Object.keys(channel.presenceState())),
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") void channel.track({});
          }),
      { presence: { key: userId } },
    );

    return () => {
      setOnlineUsers([]);
      leaveInbox();
      leavePresence();
    };
  }, [userId, queryClient]);

  return null;
}
