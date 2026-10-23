"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";

import { RelativeTime } from "@/components/shared/relative-time";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/profiles/hooks";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { type Conversation, DELETED_USER, inboxQueryOptions } from "../queries";
import { NewChatDialog } from "./new-chat-dialog";
import { OnlineAvatar } from "./online-avatar";

/** The list of chats, most recent first. Render inside an InboxBoundary. */
export function Inbox() {
  const user = useCurrentUser();
  const { data: chats } = useSuspenseQuery(inboxQueryOptions(createClient()));
  const { conversationId } = useParams<{ conversationId?: string }>();

  return (
    <div className="flex h-full flex-col">
      <InboxHeader />
      {chats.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          No messages yet. Start a chat with someone you follow.
        </p>
      ) : (
        <ul aria-label="Chats" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
          {chats.map((chat) => (
            <li key={chat.id}>
              <InboxRow chat={chat} active={chat.id === conversationId} myId={user?.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InboxHeader() {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <h2 className="text-lg font-bold">Messages</h2>
      <NewChatDialog />
    </div>
  );
}

function InboxRow({ chat, active, myId }: { chat: Conversation; active: boolean; myId?: string }) {
  const preview = chat.lastMessagePreview
    ? `${chat.lastMessageSenderId === myId ? "You: " : ""}${chat.lastMessagePreview}`
    : "Say hi 👋";

  return (
    <Link
      href={`/messages/${chat.id}` as Route}
      aria-current={active ? "page" : undefined}
      className="flex items-center gap-3 rounded-2xl p-2.5 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none aria-[current=page]:bg-accent"
    >
      <OnlineAvatar person={chat.other} size={48} />
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm", chat.unread ? "font-bold" : "font-medium")}>
          {chat.other?.username ?? DELETED_USER}
        </span>
        <span
          className={cn(
            "flex gap-1 text-sm",
            chat.unread && "font-semibold",
            // Muted text fails contrast on the active row's background.
            chat.unread || active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <span className="truncate">{preview}</span>
          {chat.lastMessageAt && (
            <span className="shrink-0">
              · <RelativeTime date={chat.lastMessageAt} />
            </span>
          )}
        </span>
      </span>
      {chat.unread && (
        <span className="size-2.5 shrink-0 rounded-full bg-primary">
          <span className="sr-only">Unread</span>
        </span>
      )}
    </Link>
  );
}

/** Three placeholder rows under the header, while the inbox streams in. */
export function InboxSkeleton() {
  return (
    <div aria-hidden>
      <div className="flex h-15 items-center border-b px-4">
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="space-y-2 p-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
