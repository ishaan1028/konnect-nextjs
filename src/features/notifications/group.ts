import type { Notification } from "./queries";

/** One row on the page: a single notification, or several likes/follows together. */
export type NotificationGroup = {
  /** The newest notification in the group (its type, post, time and link). */
  latest: Notification;
  /** Everyone in the group, newest first, each once. */
  actors: Notification["actor"][];
  /** Any of them unread. */
  read: boolean;
};

const WINDOW = 24 * 60 * 60 * 1000;

/**
 * Likes on the same post, and follows, that happen within a day of the
 * group's newest one become one row ("maya.k and 3 others liked your post").
 * Comments stay one per row (each has its own text). Input and output are
 * newest first. A fixed window rather than calendar days, so it doesn't
 * depend on the viewer's clock or time zone.
 */
export function groupNotifications(notifications: Notification[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  const open = new Map<string, NotificationGroup>();

  for (const notification of notifications) {
    const key =
      notification.type === "like"
        ? `like:${notification.post?.id}`
        : notification.type === "follow"
          ? "follow"
          : null;
    const group = key ? open.get(key) : undefined;
    const fits =
      group && Date.parse(group.latest.createdAt) - Date.parse(notification.createdAt) < WINDOW;

    if (group && fits) {
      if (!group.actors.some((actor) => actor.id === notification.actor.id)) {
        group.actors.push(notification.actor);
      }
      group.read &&= notification.read;
      continue;
    }

    const created = { latest: notification, actors: [notification.actor], read: notification.read };
    groups.push(created);
    if (key) open.set(key, created);
  }
  return groups;
}
