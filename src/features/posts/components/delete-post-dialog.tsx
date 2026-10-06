"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { queryKeys } from "@/lib/query/keys";

import { deletePostAction } from "../actions";

type DeletePostDialogProps = {
  postId: string;
  authorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Destructive, so it asks first. On success the action redirects to the profile. */
export function DeletePostDialog({ postId, authorId, open, onOpenChange }: DeletePostDialogProps) {
  const queryClient = useQueryClient();
  const remove = useAction(deletePostAction, {
    onNavigation() {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.byAuthor(authorId) });
      toast.success("Post deleted");
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't delete the post."),
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!remove.isPending) onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete post?</AlertDialogTitle>
          <AlertDialogDescription>
            The photo and its caption will be removed for everyone. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.execute({ postId })}
          >
            {remove.isPending && <Spinner aria-hidden data-icon="inline-start" />}
            {remove.isPending ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
