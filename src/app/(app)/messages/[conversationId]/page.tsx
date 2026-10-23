import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { LoadErrorBoundary } from "@/components/shared/load-error-boundary";
import { ChatBoundary } from "@/features/chat/components/chat-boundaries";
import { Thread, ThreadSkeleton } from "@/features/chat/components/thread";

export const metadata: Metadata = { title: "Messages" };

export default function ConversationPage({ params }: PageProps<"/messages/[conversationId]">) {
  return (
    <LoadErrorBoundary what="this chat">
      <Suspense fallback={<ThreadSkeleton />}>
        <Conversation params={params} />
      </Suspense>
    </LoadErrorBoundary>
  );
}

async function Conversation({ params }: Pick<PageProps<"/messages/[conversationId]">, "params">) {
  const { conversationId } = await params;
  // Not a UUID? It can't be a chat (and would be a database error otherwise).
  if (!z.uuid().safeParse(conversationId).success) notFound();

  return (
    <ChatBoundary conversationId={conversationId}>
      <Thread conversationId={conversationId} />
    </ChatBoundary>
  );
}
