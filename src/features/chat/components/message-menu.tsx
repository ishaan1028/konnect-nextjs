"use client";

import { Ellipsis, Undo2 } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { REACTIONS } from "../queries";

type MessageMenuProps = {
  mine: boolean;
  /** The viewer's current reaction on this message, if any. */
  myReaction: string | undefined;
  onReact: (emoji: string) => void;
  onUnsend: () => void;
};

/**
 * "…" next to a message: react with an emoji (your current one is marked;
 * picking it again takes it back) and, for your own messages, Unsend.
 * Shown on hover or focus (always on touch screens, which can't hover).
 */
export function MessageMenu({ mine, myReaction, onReact, onUnsend }: MessageMenuProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Message options"
              className="shrink-0 text-muted-foreground opacity-0 group-hover/message:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100"
            />
          }
        >
          <Ellipsis aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={mine ? "end" : "start"} className="w-auto">
          <DropdownMenuGroup className="flex gap-0.5">
            {REACTIONS.map((emoji) => (
              <DropdownMenuItem
                key={emoji}
                aria-label={
                  myReaction === emoji ? `Remove ${emoji} reaction` : `React with ${emoji}`
                }
                onClick={() => onReact(emoji)}
                className={cn("justify-center px-2 text-lg", myReaction === emoji && "bg-accent")}
              >
                {emoji}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          {mine && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
                <Undo2 aria-hidden />
                Unsend
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsend message?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed for everyone in this chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                onUnsend();
              }}
            >
              Unsend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** The reactions under a message: each emoji once, with a count when shared. */
export function MessageReactions({
  reactions,
  userId,
}: {
  reactions: { userId: string; emoji: string }[];
  userId: string;
}) {
  const counts = new Map<string, number>();
  for (const { emoji } of reactions) counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
  const mine = reactions.find((reaction) => reaction.userId === userId)?.emoji;
  const label = [...counts.keys()]
    .map((emoji) => (emoji === mine ? `${emoji} (yours)` : emoji))
    .join(", ");

  return (
    <p className="relative z-10 -mt-1.5 flex items-center gap-0.5 rounded-full border bg-background px-2 py-0.5 text-base leading-6 shadow-sm">
      <span className="sr-only">Reactions: {label}</span>
      {[...counts].map(([emoji, count]) => (
        <span key={emoji} aria-hidden>
          {emoji}
          {count > 1 && <span className="ml-0.5 text-xs text-foreground">{count}</span>}
        </span>
      ))}
    </p>
  );
}
