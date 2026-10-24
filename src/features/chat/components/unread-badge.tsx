"use client";

import { useQuery } from "@tanstack/react-query";

import { CountBadge } from "@/components/shared/count-badge";
import { createClient } from "@/lib/supabase/client";

import { unreadCountQueryOptions } from "../queries";

/** The number of unread chats on the Messages icon (kept fresh by ChatRealtime). */
export function UnreadBadge() {
  const { data: count = 0 } = useQuery(unreadCountQueryOptions(createClient()));
  return <CountBadge count={count} singular="unread chat" plural="unread chats" />;
}
