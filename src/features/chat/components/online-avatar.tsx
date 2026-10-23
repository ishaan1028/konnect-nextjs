"use client";

import { UserAvatar } from "@/components/shared/user-avatar";
import { avatarUrl } from "@/lib/storage";

import { useIsOnline } from "../presence";
import { type ChatPerson, DELETED_USER } from "../queries";

type OnlineAvatarProps = {
  /** null: a deleted account. */
  person: ChatPerson | null;
  size: 40 | 48;
};

const SIZE_CLASS = { 40: "size-10", 48: "size-12" } as const;

/** An avatar with a green dot while the person is online (Realtime Presence). */
export function OnlineAvatar({ person, size }: OnlineAvatarProps) {
  const online = useIsOnline(person?.id);
  return (
    <span className="relative shrink-0">
      <UserAvatar
        name={person ? person.fullName || person.username : DELETED_USER}
        src={avatarUrl(person?.avatarPath)}
        pixelSize={size}
        className={SIZE_CLASS[size]}
      />
      {online && (
        <span className="absolute right-0 bottom-0 size-3 rounded-full bg-green-500 ring-2 ring-background">
          <span className="sr-only">Online</span>
        </span>
      )}
    </span>
  );
}
