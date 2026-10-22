import { Suspense } from "react";

import { ChatBoundary } from "@/features/chat/components/chat-boundaries";
import { Inbox, InboxSkeleton } from "@/features/chat/components/inbox";

/**
 * Messages: the inbox on the left, the open chat on the right. A layout, so
 * the inbox stays mounted (and keeps its scroll) while you switch chats.
 * Phones show the inbox; an open chat covers the screen (see Thread).
 */
export default function MessagesLayout({ children }: LayoutProps<"/messages">) {
  return (
    <div className="mx-auto max-w-5xl md:grid md:h-[calc(100dvh-5.5rem)] md:grid-cols-[20rem_minmax(0,1fr)] md:overflow-hidden md:rounded-2xl md:border">
      <h1 className="sr-only">Messages</h1>
      <aside aria-label="Inbox" className="md:min-h-0 md:border-r">
        <Suspense fallback={<InboxSkeleton />}>
          <ChatBoundary>
            <Inbox />
          </ChatBoundary>
        </Suspense>
      </aside>
      <div className="md:min-h-0">{children}</div>
    </div>
  );
}
