"use client";

import type { Route } from "next";
import Link from "next/link";
import { type KeyboardEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/features/profiles/hooks";
import { cn } from "@/lib/utils";

import { useAddComment } from "../hooks";
import { COMMENT_MAX_LENGTH } from "../constants";

type CommentFormProps = {
  postId: string;
  /** The textarea's id, so the post's comment button can focus it. */
  inputId: string;
  className?: string;
};

/** Shown from this many characters on, so the limit is never a surprise. */
const COUNTER_FROM = COMMENT_MAX_LENGTH - 100;

/**
 * "Add a comment…": Enter posts, Shift+Enter adds a new line, blank comments
 * can't be sent. Posting is optimistic (the comment appears at once); if it
 * fails, the text comes back so nothing typed is lost. A chat-style single
 * field, so it's a controlled textarea rather than a full React Hook Form.
 * Render where the current user is cached (a CurrentUserBoundary).
 */
export function CommentForm({ postId, inputId, className }: CommentFormProps) {
  const user = useCurrentUser();
  const add = useAddComment(postId);
  const [body, setBody] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const hintId = useId();

  if (!user) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        <Link
          href={`/login?${new URLSearchParams({ next: `/p/${postId}` })}` as Route}
          className="font-semibold text-foreground hover:underline"
        >
          Log in
        </Link>{" "}
        to comment.
      </p>
    );
  }

  const submit = () => {
    // The same rule as commentBodySchema (which the server checks), without
    // loading Zod on the post page.
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > COMMENT_MAX_LENGTH) return;
    const typed = body;
    setBody("");
    setAnnouncement("");
    add.mutate(
      { body: trimmed, tempId: `temp-${crypto.randomUUID()}` },
      {
        onSuccess: () => setAnnouncement("Comment posted."),
        // Give the text back unless they've already started a new one.
        onError: () => setBody((current) => current || typed),
      },
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: Enter also confirms IME input (e.g. Japanese); don't send then.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const empty = body.trim().length === 0;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className={cn("flex items-end gap-2", className)}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className="sr-only">
          Add a comment
        </label>
        <Textarea
          id={inputId}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={COMMENT_MAX_LENGTH}
          placeholder="Add a comment…"
          enterKeyHint="send"
          aria-describedby={hintId}
          className="max-h-32 min-h-10 rounded-3xl py-2.5"
        />
        <p id={hintId} className="sr-only">
          Press Enter to post, Shift and Enter for a new line.
        </p>
        {body.length >= COUNTER_FROM && (
          <p className="mt-1 px-3 text-xs text-muted-foreground tabular-nums">
            {body.length}/{COMMENT_MAX_LENGTH}
          </p>
        )}
      </div>
      <Button type="submit" variant="ghost" className="text-primary" disabled={empty}>
        Post
      </Button>
      {/* Screen readers hear the result; the comment itself appears visually. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </form>
  );
}

/** The comment box's size, for the moment the viewer streams in. */
export function CommentFormSkeleton() {
  return <Skeleton aria-hidden className="h-10 rounded-3xl" />;
}
