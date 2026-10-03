import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Chat" };

export default function ConversationPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader title="Chat" />
      <ComingSoon
        icon={MessagesSquare}
        title="Conversation"
        description="Message history, live updates and a composer."
        phase={11}
      />
    </div>
  );
}
