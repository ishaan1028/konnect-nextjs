"use client";

import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * The phone's share sheet where there is one (Web Share API), otherwise
 * copies the post's link.
 */
export function SharePostButton({
  postId,
  authorUsername,
}: {
  postId: string;
  authorUsername: string;
}) {
  const share = async () => {
    const url = `${location.origin}/p/${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Post by @${authorUsername} on Konnect`, url });
      } catch {
        // Closing the share sheet rejects; that's not an error worth showing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  return (
    <Button variant="ghost" size="icon-lg" aria-label="Share" onClick={share}>
      <Send aria-hidden className="size-6" />
    </Button>
  );
}
