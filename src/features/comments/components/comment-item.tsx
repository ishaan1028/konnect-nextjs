"use client";

import { Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { RelativeTime } from "@/components/shared/relative-time";
import { UserAvatar } from "@/components/shared/user-avatar";
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
import { avatarUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

import type { Comment } from "../queries";

type CommentItemProps = {
  comment: Comment;
  onDelete: (commentId: string) => void;
};

/** One comment: avatar, @username, text, age, and Delete when allowed. */
export function CommentItem({ comment, onDelete }: CommentItemProps) {
  const [confirming, setConfirming] = useState(false);
  const profileHref = `/${comment.author.username}` as Route;

  return (
    <article
      aria-label={`Comment by @${comment.author.username}`}
      // A pending comment (still saving) is shown slightly faded.
      className={cn("flex gap-3 py-2", comment.pending && "opacity-60")}
      aria-busy={comment.pending || undefined}
    >
      <Link href={profileHref} className="shrink-0 rounded-full" tabIndex={-1} aria-hidden>
        <UserAvatar
          name={comment.author.fullName || comment.author.username}
          src={avatarUrl(comment.author.avatarPath)}
          pixelSize={32}
          className="size-8"
        />
      </Link>
      <div className="min-w-0 flex-1 text-sm">
        <p className="break-words whitespace-pre-line">
          <Link href={profileHref} className="mr-1.5 font-semibold hover:underline">
            {comment.author.username}
          </Link>
          {comment.body}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {comment.pending ? "Posting…" : <RelativeTime date={comment.createdAt} />}
        </p>
      </div>
      {comment.canDelete && (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete comment"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirming(true)}
          >
            <Trash2 aria-hidden />
          </Button>
          <AlertDialog open={confirming} onOpenChange={setConfirming}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                <AlertDialogDescription>
                  It will be removed for everyone. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    setConfirming(false);
                    onDelete(comment.id);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </article>
  );
}
