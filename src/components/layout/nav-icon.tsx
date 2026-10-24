import type { ReactNode } from "react";

import { UnreadBadge } from "@/features/chat/components/unread-badge";
import { NotificationBadge } from "@/features/notifications/components/notification-badge";

const BADGES: Record<string, ReactNode> = {
  "/messages": <UnreadBadge />,
  "/notifications": <NotificationBadge />,
};

/** A nav item's icon, with its live count (unread chats, new notifications). */
export function navIcon(href: string, icon: ReactNode) {
  const badge = BADGES[href];
  if (!badge) return icon;
  return (
    <span className="relative inline-flex">
      {icon}
      {badge}
    </span>
  );
}
