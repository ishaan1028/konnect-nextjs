import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader title="Messages" description="Real-time chats with people you follow." />
      <ComingSoon
        icon={MessageCircle}
        title="Your inbox"
        description="Live messages, typing indicators, online status and read receipts."
        phase={11}
      />
    </div>
  );
}
