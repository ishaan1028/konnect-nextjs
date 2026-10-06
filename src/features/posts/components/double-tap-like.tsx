"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { type ReactNode, useState } from "react";

import type { CurrentUser } from "@/features/profiles/queries";
import { queryKeys } from "@/lib/query/keys";

import { useToggleLike } from "../hooks";
import type { LikeStatus } from "../queries";

/**
 * Double-tap (or double-click) the photo to like it, with a heart burst.
 * Like Instagram, it only ever likes (never unlikes); the Like button is the
 * keyboard and screen-reader way to do the same.
 *
 * Reads the signed-in user and the like state from the cache at tap time, not
 * while rendering, so it can wrap the photo without delaying it behind a
 * Suspense boundary (the photo is the page's largest paint).
 */
export function DoubleTapLike({ postId, children }: { postId: string; children: ReactNode }) {
  const queryClient = useQueryClient();
  const toggle = useToggleLike(postId);
  const [burst, setBurst] = useState(0);

  const onDoubleClick = () => {
    if (!queryClient.getQueryData<CurrentUser | null>(queryKeys.currentUser)) return;
    setBurst((count) => count + 1);
    const status = queryClient.getQueryData<LikeStatus>(queryKeys.likes.status(postId));
    if (!status?.liked) toggle.mutate(true);
  };

  return (
    // touch-manipulation: no double-tap zoom, so phones deliver the double tap.
    <div className="relative touch-manipulation select-none" onDoubleClick={onDoubleClick}>
      {children}
      {burst > 0 && (
        <Heart
          key={burst}
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto size-24 animate-heart-burst fill-white text-white drop-shadow-lg"
        />
      )}
    </div>
  );
}
