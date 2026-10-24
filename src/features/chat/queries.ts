import type { SupabaseClient } from "@supabase/supabase-js";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

export type ChatPerson = {
  id: string;
  username: string;
  fullName: string;
  avatarPath: string | null;
};

/** Who someone is once they've deleted their account. */
export const DELETED_USER = "Deleted user";

export type Conversation = {
  id: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  unread: boolean;
  /** null: they deleted their account (shown as "Deleted user"). */
  other: ChatPerson | null;
  /** When the other person last read the chat ("Seen"). */
  otherLastReadAt: string | null;
};

/** The reactions on offer (the database allows exactly these). */
export const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"] as const;

export type Reaction = { userId: string; emoji: string };

export type Message = {
  id: string;
  conversationId: string;
  /** null: sent by someone who has since deleted their account. */
  senderId: string | null;
  body: string;
  createdAt: string;
  /** One per person (theirs or yours), newest last. */
  reactions: Reaction[];
  /** Optimistic messages: still sending, or failed (with a Retry). */
  status?: "sending" | "failed";
};

export type MessagesPage = { items: Message[]; nextCursor: string | null };

/** My conversations, most recent first (the inbox; also the threads' headers). */
export const inboxQueryOptions = (supabase: Supabase) =>
  queryOptions({
    queryKey: queryKeys.chat.inbox,
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase.rpc("get_inbox");
      if (error) throw error;
      return data.map((row) => ({
        id: row.id,
        lastMessageAt: row.last_message_at ?? null,
        lastMessagePreview: row.last_message_preview ?? null,
        lastMessageSenderId: row.last_message_sender_id ?? null,
        unread: row.unread,
        otherLastReadAt: row.other_last_read_at ?? null,
        other: row.other_id
          ? {
              id: row.other_id,
              username: row.other_username,
              fullName: row.other_full_name,
              avatarPath: row.other_avatar_path ?? null,
            }
          : null,
      }));
    },
  });

/** How many chats have unread messages (the nav badge). 0 when signed out. */
export const unreadCountQueryOptions = (supabase: Supabase) =>
  queryOptions({
    queryKey: queryKeys.chat.unreadCount,
    queryFn: async (): Promise<number> => {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) return 0;
      const { data, error } = await supabase.rpc("get_unread_count");
      if (error) throw error;
      return data;
    },
  });

const PAGE_SIZE = 30;

/** A conversation's messages, newest first, a page at a time (scrolling up loads older). */
export const messagesQueryOptions = (supabase: Supabase, conversationId: string) =>
  infiniteQueryOptions({
    queryKey: queryKeys.chat.messages(conversationId),
    queryFn: async ({ pageParam }): Promise<MessagesPage> => {
      let query = supabase
        .from("messages")
        .select(
          "id, conversation_id, sender_id, body, created_at, message_reactions(user_id, emoji)",
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      // shortcut: the cursor is created_at alone; two messages in one chat in the same microsecond could split across pages.
      if (pageParam) query = query.lt("created_at", pageParam);
      const { data, error } = await query;
      if (error) throw error;

      const items = data.map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        body: row.body,
        createdAt: row.created_at,
        reactions: row.message_reactions.map((reaction) => ({
          userId: reaction.user_id,
          emoji: reaction.emoji,
        })),
      }));
      return {
        items,
        nextCursor: items.length === PAGE_SIZE ? (items.at(-1)?.createdAt ?? null) : null,
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
