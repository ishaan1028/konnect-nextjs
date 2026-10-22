import type { ReactNode } from "react";

import { UnreadBadge } from "@/features/chat/components/unread-badge";

/** A nav item's icon; Messages also carries the unread-chats badge. */
export function navIcon(href: string, icon: ReactNode) {
  if (href !== "/messages") return icon;
  return (
    <span className="relative inline-flex">
      {icon}
      <UnreadBadge />
    </span>
  );
}
