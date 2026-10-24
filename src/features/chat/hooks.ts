"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { type InfiniteData, type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { queryKeys } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";

import { joinChannel } from "./channel";
import type { Conversation, Message, MessagesPage } from "./queries";

type Messages = InfiniteData<MessagesPage>;

/** Adds a message (newest first), or replaces the copy already there (same id). */
function upsertMessage(client: QueryClient, message: Message) {
  client.setQueryData<Messages>(queryKeys.chat.messages(message.conversationId), (data) => {
    if (!data) return data;
    const exists = data.pages.some((page) => page.items.some((item) => item.id === message.id));
    return {
      ...data,
      pages: data.pages.map((page, index) => ({
        ...page,
        items: exists
          ? page.items.map((item) =>
              // Keep reactions already here: a realtime echo doesn't carry them.
              item.id === message.id ? { ...message, reactions: item.reactions } : item,
            )
          : index === 0
            ? [message, ...page.items]
            : page.items,
      })),
    };
  });
}

/** Applies `change` to the message with this id, wherever it is in the cache. */
function updateMessages(
  client: QueryClient,
  conversationId: string,
  change: (items: Message[]) => Message[],
) {
  client.setQueryData<Messages>(
    queryKeys.chat.messages(conversationId),
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({ ...page, items: change(page.items) })),
      },
  );
}

const removeMessage = (client: QueryClient, conversationId: string, messageId: string) =>
  updateMessages(client, conversationId, (items) => items.filter((item) => item.id !== messageId));

/** Sets one person's reaction on a message (null removes it). */
const setReaction = (
  client: QueryClient,
  conversationId: string,
  messageId: string,
  userId: string,
  emoji: string | null,
) =>
  updateMessages(client, conversationId, (items) =>
    items.map((item) =>
      item.id === messageId
        ? {
            ...item,
            reactions: [
              ...item.reactions.filter((reaction) => reaction.userId !== userId),
              ...(emoji ? [{ userId, emoji }] : []),
            ],
          }
        : item,
    ),
  );

const UNIQUE_VIOLATION = "23505";

/**
 * Send messages optimistically: a message shows at once ("sending"), then is
 * saved straight from the browser (RLS checks it's yours and you're in the
 * chat; see PLAN.md for why chat skips Server Actions). Its id is chosen here,
 * so a retry is the same row and can never send it twice.
 */
export function useSendMessage(conversationId: string, userId: string) {
  const queryClient = useQueryClient();
  // One insert at a time, in the order they were sent: parallel inserts can
  // commit out of order, and everyone's chat is ordered by the server's time.
  const queue = useRef(Promise.resolve());

  const deliver = async (message: Message) => {
    const { data, error } = await createClient()
      .from("messages")
      .insert({
        id: message.id,
        conversation_id: conversationId,
        sender_id: userId,
        body: message.body,
      })
      .select("created_at")
      .single();
    if (error && error.code !== UNIQUE_VIOLATION) {
      upsertMessage(queryClient, { ...message, status: "failed" });
      return;
    }
    // The server's time, so everyone orders the chat the same way.
    upsertMessage(queryClient, {
      ...message,
      status: undefined,
      createdAt: data?.created_at ?? message.createdAt,
    });
  };

  const enqueue = (message: Message) => {
    queue.current = queue.current
      .then(() => deliver(message))
      .catch(() => upsertMessage(queryClient, { ...message, status: "failed" }));
  };

  return {
    send(body: string) {
      const message: Message = {
        id: crypto.randomUUID(),
        conversationId,
        senderId: userId,
        body,
        createdAt: new Date().toISOString(),
        reactions: [],
        status: "sending",
      };
      upsertMessage(queryClient, message);
      enqueue(message);
    },
    retry(message: Message) {
      upsertMessage(queryClient, { ...message, status: "sending" });
      enqueue(message);
    },
  };
}

/**
 * Unsend your own message, and react to any message (one emoji each; the
 * same one again takes it back). Optimistic, straight from the browser like
 * sending (RLS checks it); the other person hears over the chat's channel.
 */
export function useMessageActions(conversationId: string, userId: string) {
  const queryClient = useQueryClient();
  const failed = (what: string) => {
    toast.error(`Couldn't ${what}. Please try again.`);
    void queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(conversationId) });
  };

  return {
    async unsend(message: Message) {
      removeMessage(queryClient, conversationId, message.id);
      const { error } = await createClient().from("messages").delete().eq("id", message.id);
      if (error) failed("unsend it");
    },
    async react(message: Message, emoji: string) {
      const mine = message.reactions.find((reaction) => reaction.userId === userId)?.emoji;
      const next = mine === emoji ? null : emoji;
      setReaction(queryClient, conversationId, message.id, userId, next);
      const reactions = () => createClient().from("message_reactions");
      const change = (emoji: string) =>
        reactions().update({ emoji }).eq("message_id", message.id).eq("user_id", userId);
      let { error } = !next
        ? await reactions().delete().eq("message_id", message.id).eq("user_id", userId)
        : mine
          ? await change(next)
          : await reactions().insert({ message_id: message.id, user_id: userId, emoji: next });
      // Reacted from another tab meanwhile: change that reaction instead.
      if (next && error?.code === UNIQUE_VIOLATION) ({ error } = await change(next));
      if (error) failed("react");
    },
  };
}

/** Marks the chat read (server time) and clears its unread state everywhere. */
export function useMarkRead(conversationId: string) {
  const queryClient = useQueryClient();
  return async () => {
    queryClient.setQueryData<Conversation[]>(queryKeys.chat.inbox, (inbox) =>
      inbox?.map((chat) => (chat.id === conversationId ? { ...chat, unread: false } : chat)),
    );
    const { error } = await createClient().rpc("mark_conversation_read", {
      conversation_id: conversationId,
    });
    if (!error) void queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadCount });
  };
}

type IncomingReaction = { message_id: string; user_id: string; emoji: string | null };

type IncomingMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

/**
 * Live updates for one open chat over its private Realtime channel
 * (`conversation:<id>`, authorized by RLS): new messages, the other person
 * reading ("Seen") and typing. Returns whether they're typing and a function
 * to tell them you are.
 */
export function useConversationChannel(
  conversationId: string,
  userId: string,
  onIncoming: () => void,
) {
  const queryClient = useQueryClient();
  const [otherTyping, setOtherTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSent = useRef(0);

  // Effect events always see the latest props without re-subscribing.
  const onMessage = useEffectEvent((payload: IncomingMessage) => {
    upsertMessage(queryClient, {
      id: payload.id,
      conversationId: payload.conversation_id,
      senderId: payload.sender_id,
      body: payload.body,
      createdAt: payload.created_at,
      reactions: [],
    });
    if (payload.sender_id !== userId) {
      setOtherTyping(false);
      onIncoming();
    }
  });
  const onUnsend = useEffectEvent((payload: { id: string }) =>
    removeMessage(queryClient, conversationId, payload.id),
  );
  const onReaction = useEffectEvent((payload: IncomingReaction) =>
    setReaction(queryClient, conversationId, payload.message_id, payload.user_id, payload.emoji),
  );
  const onRead = useEffectEvent((payload: { user_id: string; last_read_at: string }) => {
    if (payload.user_id === userId) return;
    queryClient.setQueryData<Conversation[]>(queryKeys.chat.inbox, (inbox) =>
      inbox?.map((chat) =>
        chat.id === conversationId ? { ...chat, otherLastReadAt: payload.last_read_at } : chat,
      ),
    );
  });

  useEffect(() => {
    let typingTimer: ReturnType<typeof setTimeout> | undefined;
    const leave = joinChannel(`conversation:${conversationId}`, (channel) => {
      channelRef.current = channel;
      channel
        .on("broadcast", { event: "message" }, ({ payload }) =>
          onMessage(payload as IncomingMessage),
        )
        .on("broadcast", { event: "unsend" }, ({ payload }) => onUnsend(payload as { id: string }))
        .on("broadcast", { event: "reaction" }, ({ payload }) =>
          onReaction(payload as IncomingReaction),
        )
        .on("broadcast", { event: "read" }, ({ payload }) =>
          onRead(payload as { user_id: string; last_read_at: string }),
        )
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if ((payload as { user_id: string }).user_id === userId) return;
          setOtherTyping(true);
          clearTimeout(typingTimer);
          typingTimer = setTimeout(() => setOtherTyping(false), 3000);
        })
        .subscribe();
    });

    return () => {
      clearTimeout(typingTimer);
      channelRef.current = null;
      leave();
    };
  }, [conversationId, userId]);

  return {
    otherTyping,
    /** At most once every 2 seconds while typing. */
    sendTyping() {
      const now = Date.now();
      if (now - lastTypingSent.current < 2000) return;
      lastTypingSent.current = now;
      void channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: userId },
      });
    },
  };
}
