"use client";

import { UserAvatar } from "@/components/shared/user-avatar";
import { useCurrentUser } from "@/features/profiles/hooks";
import { avatarUrl } from "@/lib/storage";

/** "What's new, Alex?". Falls back to the generic prompt while it streams in. */
export function ComposerGreeting() {
  const user = useCurrentUser();
  const firstName = user?.fullName.split(/\s+/)[0];
  return <>{firstName ? `What's new, ${firstName}?` : "What's new?"}</>;
}

/** Your avatar beside the prompt. */
export function ComposerAvatar() {
  const user = useCurrentUser();
  return (
    <UserAvatar
      name={user?.fullName || user?.username || "You"}
      src={avatarUrl(user?.avatarPath)}
      pixelSize={40}
      className="size-10"
    />
  );
}
