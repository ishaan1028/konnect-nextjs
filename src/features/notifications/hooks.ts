"use client";

import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";

/** Marks every notification read (server time) and clears the badge. */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return async () => {
    queryClient.setQueryData(queryKeys.notifications.unreadCount(), 0);
    const { error } = await createClient().rpc("mark_notifications_read");
    if (error) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    }
  };
}
