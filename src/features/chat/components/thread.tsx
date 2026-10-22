"use client";

import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, Send } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
  type KeyboardEvent,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useInView } from "react-intersection-observer";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/features/profiles/hooks";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

import { useConversationChannel, useMarkRead, useSendMessage } from "../hooks";
import { useIsOnline } from "../presence";
import {
  type Conversation,
  inboxQueryOptions,
  type Message,
  messagesQueryOptions,
} from "../queries";
import { OnlineAvatar } from "./online-avatar";

const MAX_LENGTH = 2000;
/** "At the bottom" means within this many pixels of it. */
const BOTTOM_SLACK = 80;

/**
 * One open chat: header, history (scroll up for older), composer. Live over
 * the conversation's private channel. Render inside a ChatBoundary.
 */
export function Thread({ conversationId }: { conversationId: string }) {
  const user = useCurrentUser();
  const { data: chats } = useSuspenseQuery(inboxQueryOptions(createClient()));
  const chat = chats.find((item) => item.id === conversationId);

  if (!user || !chat) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-muted-foreground">This chat isn&apos;t available.</p>
        <Link href="/messages" className={buttonVariants({ variant: "outline" })}>
          Back to messages
        </Link>
      </div>
    );
  }

  return (
    <OpenThread key={conversationId} conversationId={conversationId} userId={user.id} chat={chat} />
  );
}

type OpenThreadProps = { conversationId: string; userId: string; chat: Conversation };

function OpenThread({ conversationId, userId, chat }: OpenThreadProps) {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useSuspenseInfiniteQuery(
    messagesQueryOptions(createClient(), conversationId),
  );
  const markRead = useMarkRead(conversationId);
  const { send, retry } = useSendMessage(conversationId, userId);
  const online = useIsOnline(chat.other.id);
  const now = useNow();

  // Read what's here when you open it, and whenever something arrives while
  // the tab is visible (a hidden tab leaves it unread until you come back).
  const readIfVisible = () => {
    if (document.visibilityState === "visible") void markRead();
  };
  const { otherTyping, sendTyping } = useConversationChannel(conversationId, userId, readIfVisible);
  const onVisible = useEffectEvent(readIfVisible);
  useEffect(() => {
    onVisible();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [conversationId]);

  // Pages are newest first; the chat reads oldest to newest.
  const messages = data.pages.flatMap((page) => page.items).toReversed();
  const newest = messages.at(-1);

  // --- Scrolling --------------------------------------------------------------
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const heightBeforeOlder = useRef<number | null>(null);
  const [showNewPill, setShowNewPill] = useState(false);

  const scrollToBottom = () => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
    setShowNewPill(false);
  };

  // Older messages load when the top comes into view; remember the height so
  // the view doesn't jump when they're added above.
  const { ref: topRef } = useInView({
    rootMargin: "200px",
    onChange: (inView) => {
      if (!inView || !hasNextPage || isFetchingNextPage || !scroller.current) return;
      heightBeforeOlder.current = scroller.current.scrollHeight;
      void fetchNextPage();
    },
  });

  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && heightBeforeOlder.current !== null) {
      element.scrollTop += element.scrollHeight - heightBeforeOlder.current;
      heightBeforeOlder.current = null;
    }
  }, [data.pages.length]);

  // New message at the bottom: follow it if you were at the bottom (or sent
  // it); otherwise don't yank the view, offer a "New messages" pill instead.
  const followNewest = useEffectEvent(() => {
    if (atBottom.current || newest?.senderId === userId) scrollToBottom();
    else setShowNewPill(true);
  });
  const newestId = newest?.id;
  useLayoutEffect(() => {
    if (newestId) followNewest();
  }, [newestId]);

  // The typing line is added below the last message: keep it in view if you
  // were at the bottom (scrolled up reading history, the view stays put).
  const keepAtBottom = useEffectEvent(() => {
    if (atBottom.current) scrollToBottom();
  });
  useLayoutEffect(() => {
    if (otherTyping) keepAtBottom();
  }, [otherTyping]);

  const onScroll = () => {
    const element = scroller.current;
    if (!element) return;
    atBottom.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < BOTTOM_SLACK;
    if (atBottom.current) setShowNewPill(false);
  };

  // "Seen" goes under your latest delivered message once they've read it.
  const lastMine = messages.findLast((message) => message.senderId === userId && !message.status);
  const seen =
    lastMine && chat.otherLastReadAt !== null && chat.otherLastReadAt >= lastMine.createdAt;

  return (
    // Phones: full screen over the app (like Instagram); wider: the right pane.
    <section
      aria-label={`Chat with @${chat.other.username}`}
      className="fixed inset-0 z-50 flex flex-col bg-background md:static md:z-auto md:h-full"
    >
      <header className="flex items-center gap-3 border-b px-3 py-2.5">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
        >
          <ArrowLeft aria-hidden />
        </Link>
        <OnlineAvatar person={chat.other} size={40} />
        <div className="min-w-0">
          <Link
            href={`/${chat.other.username}` as Route}
            className="block truncate font-semibold hover:underline"
          >
            {chat.other.username}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {otherTyping ? "typing…" : online ? "Active now" : chat.other.fullName}
          </p>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto px-4 py-3">
          <div ref={topRef} aria-hidden />
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Spinner aria-label="Loading earlier messages" />
            </div>
          )}
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Say hi to {chat.other.fullName || chat.other.username} 👋
            </p>
          )}
          {/* A log: screen readers announce new messages as they arrive. */}
          <ol role="log" aria-label="Messages" className="flex flex-col">
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              // Day labels use the viewer's time zone, so they're added after
              // hydration (now !== null) to keep the server HTML identical.
              const newDay =
                now !== null &&
                (!previous || dayKey(previous.createdAt) !== dayKey(message.createdAt));
              const grouped =
                !newDay &&
                previous?.senderId === message.senderId &&
                Date.parse(message.createdAt) - Date.parse(previous.createdAt) < 5 * 60_000;
              return (
                <li key={message.id} className={grouped ? "mt-0.5" : "mt-3"}>
                  {newDay && now !== null && (
                    <p className="my-3 text-center text-xs font-medium text-muted-foreground">
                      {dayLabel(message.createdAt, now)}
                    </p>
                  )}
                  <Bubble message={message} mine={message.senderId === userId} onRetry={retry} />
                  {message.id === lastMine?.id && seen && (
                    <p className="mt-0.5 text-right text-xs text-muted-foreground">Seen</p>
                  )}
                </li>
              );
            })}
          </ol>
          {otherTyping && (
            <p aria-hidden className="mt-2 text-xs text-muted-foreground">
              {chat.other.username} is typing…
            </p>
          )}
        </div>
        {showNewPill && (
          <Button
            size="sm"
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-lg"
          >
            New messages
            <ArrowDown aria-hidden data-icon="inline-end" />
          </Button>
        )}
      </div>

      <Composer onSend={send} onTyping={sendTyping} />
    </section>
  );
}

function Bubble({
  message,
  mine,
  onRetry,
}: {
  message: Message;
  mine: boolean;
  onRetry: (message: Message) => void;
}) {
  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <p
        title={formatDate(message.createdAt)}
        className={cn(
          "max-w-[75%] rounded-3xl px-4 py-2 text-sm break-words whitespace-pre-wrap",
          mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          message.status === "sending" && "opacity-60",
        )}
      >
        {message.body}
      </p>
      {message.status === "failed" && (
        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
          Not sent.
          <button
            type="button"
            onClick={() => onRetry(message)}
            className="font-semibold underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            Retry
          </button>
        </p>
      )}
    </div>
  );
}

/** Enter sends, Shift+Enter adds a line; tells the other person you're typing. */
function Composer({ onSend, onTyping }: { onSend: (body: string) => void; onTyping: () => void }) {
  const [body, setBody] = useState("");
  const trimmed = body.trim();

  const submit = () => {
    if (!trimmed) return;
    onSend(trimmed);
    setBody("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 border-t p-3"
    >
      <label htmlFor="message-input" className="sr-only">
        Message
      </label>
      <Textarea
        id="message-input"
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          if (event.target.value) onTyping();
        }}
        onKeyDown={onKeyDown}
        rows={1}
        maxLength={MAX_LENGTH}
        placeholder="Message…"
        enterKeyHint="send"
        className="max-h-32 min-h-10 rounded-3xl py-2.5"
      />
      <Button type="submit" size="icon" aria-label="Send" disabled={!trimmed}>
        <Send aria-hidden />
      </Button>
    </form>
  );
}

/** The local calendar day of a timestamp (YYYY-M-D). */
function dayKey(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(iso: string, now: number) {
  if (dayKey(iso) === dayKey(new Date(now).toISOString())) return "Today";
  if (dayKey(iso) === dayKey(new Date(now - 86_400_000).toISOString())) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));
}

/** The thread's shape while it streams in: header, a few bubbles, composer. */
export function ThreadSkeleton() {
  return (
    <div aria-hidden className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-2.5">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex-1 space-y-3 p-4">
        <Skeleton className="h-9 w-48 rounded-3xl" />
        <Skeleton className="ml-auto h-9 w-40 rounded-3xl" />
        <Skeleton className="h-9 w-56 rounded-3xl" />
      </div>
      <div className="border-t p-3">
        <Skeleton className="h-10 rounded-3xl" />
      </div>
    </div>
  );
}
