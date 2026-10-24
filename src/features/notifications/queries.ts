import type { SupabaseClient } from "@supabase/supabase-js";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import type { PersonSummary } from "@/features/follows/queries";
import { queryKeys } from "@/lib/query/keys";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

export type Notification = {
  id: string;
  type: "like" | "comment" | "follow";
  createdAt: string;
  read: boolean;
  actor: PersonSummary;
  /** Likes and comments: the post they're about. */
  post: { id: string; imagePath: string; thumbhash: string | null } | null;
  commentBody: string | null;
  /** Follows: for the Follow back button. */
  viewerFollowsActor: boolean;
  actorFollowsViewer: boolean;
};

export type NotificationsPage = {
  items: Notification[];
  nextCursor: { createdAt: string; id: string } | null;
};

const PAGE_SIZE = 20;

/** The viewer's notifications, newest first. */
export const notificationsQueryOptions = (supabase: Supabase) =>
  infiniteQueryOptions({
    queryKey: queryKeys.notifications.list(),
    queryFn: async ({ pageParam }): Promise<NotificationsPage> => {
      const { data, error } = await supabase.rpc("get_notifications", {
        cursor_created_at: pageParam?.createdAt,
        cursor_id: pageParam?.id,
        max_results: PAGE_SIZE,
      });
      if (error) throw error;

      const items = data.map((row) => ({
        id: row.id,
        type: row.type as Notification["type"],
        createdAt: row.created_at,
        read: row.read,
        actor: {
          id: row.actor_id,
          username: row.actor_username,
          fullName: row.actor_full_name,
          avatarPath: row.actor_avatar_path ?? null,
        },
        post: row.post_id
          ? {
              id: row.post_id,
              imagePath: row.post_image_path,
              thumbhash: row.post_thumbhash ?? null,
            }
          : null,
        commentBody: row.comment_body ?? null,
        viewerFollowsActor: row.viewer_follows_actor,
        actorFollowsViewer: row.actor_follows_viewer,
      }));
      const last = items.at(-1);
      return {
        items,
        nextCursor:
          items.length === PAGE_SIZE && last ? { createdAt: last.createdAt, id: last.id } : null,
      };
    },
    initialPageParam: null as NotificationsPage["nextCursor"],
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

/** Unread notifications (the nav badge). 0 when signed out. */
export const unreadNotificationsQueryOptions = (supabase: Supabase) =>
  queryOptions({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async (): Promise<number> => {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) return 0;
      // RLS only counts the viewer's own.
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });
