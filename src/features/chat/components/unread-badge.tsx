"use client";

import { useQuery } from "@tanstack/react-query";

import { pluralize } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

import { unreadCountQueryOptions } from "../queries";

/**
 * The number of unread chats on the Messages icon. Fetched in the browser and
 * kept fresh by ChatRealtime; absolutely positioned, so it never shifts the nav.
 */
export function UnreadBadge() {
  const { data: count = 0 } = useQuery(unreadCountQueryOptions(createClient()));
  if (count === 0) return null;

  return (
    <span className="absolute -top-1.5 -right-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] leading-none font-semibold text-white">
      <span aria-hidden>{count > 9 ? "9+" : count}</span>
      <span className="sr-only">
        , {count} unread {pluralize(count, "chat", "chats")}
      </span>
    </span>
  );
}
