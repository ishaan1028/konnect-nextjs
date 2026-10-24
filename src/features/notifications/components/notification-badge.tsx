"use client";

import { useQuery } from "@tanstack/react-query";

import { CountBadge } from "@/components/shared/count-badge";
import { createClient } from "@/lib/supabase/client";

import { unreadNotificationsQueryOptions } from "../queries";

/** Unread notifications on the heart icon (kept fresh by ChatRealtime's user channel). */
export function NotificationBadge() {
  const { data: count = 0 } = useQuery(unreadNotificationsQueryOptions(createClient()));
  return <CountBadge count={count} singular="new notification" plural="new notifications" />;
}
