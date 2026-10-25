"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { InboxRow } from "@/features/chat/components/inbox";
import { inboxQueryOptions } from "@/features/chat/queries";
import { useCurrentUser } from "@/features/profiles/hooks";
import { createClient } from "@/lib/supabase/client";

const SHOWN = 4;

/** Your latest chats (live, like the inbox). Render inside a ChatBoundary. */
export function RecentChats() {
  const user = useCurrentUser();
  const { data: chats } = useSuspenseQuery(inboxQueryOptions(createClient()));

  if (chats.length === 0) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No chats yet.
      </p>
    );
  }
  return (
    <ul className="space-y-0.5">
      {chats.slice(0, SHOWN).map((chat) => (
        <li key={chat.id}>
          <InboxRow chat={chat} active={false} myId={user?.id} />
        </li>
      ))}
    </ul>
  );
}
