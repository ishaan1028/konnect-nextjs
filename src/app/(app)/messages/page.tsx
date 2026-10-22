import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { NewChatDialog } from "@/features/chat/components/new-chat-dialog";
import { CurrentUserBoundary } from "@/features/profiles/components/current-user-boundary";

export const metadata: Metadata = { title: "Messages" };

/** The right pane before a chat is picked (phones just show the inbox). */
export default function MessagesPage() {
  return (
    <div className="hidden h-full flex-col items-center justify-center gap-4 p-8 text-center md:flex">
      <span className="flex size-20 items-center justify-center rounded-full border-2">
        <MessageCircle aria-hidden className="size-9" />
      </span>
      <div className="space-y-1">
        <p className="text-xl font-semibold">Your messages</p>
        <p className="text-sm text-muted-foreground">Send a message to someone you follow.</p>
      </div>
      <Suspense fallback={null}>
        <CurrentUserBoundary>
          <NewChatDialog variant="button" />
        </CurrentUserBoundary>
      </Suspense>
    </div>
  );
}
