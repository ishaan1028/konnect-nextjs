"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
  /** In the post's modal: stay on the page underneath instead of going to the profile. */
  inModal?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Destructive, so it asks first. On the post's page the action redirects to
 * the profile; in its modal, the modal closes onto the page underneath.
 */
export function DeletePostDialog({
  postId,
  inModal = false,
  open,
  onOpenChange,
}: DeletePostDialogProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const deleted = () => {
    // The post leaves the feed, Explore, its author's grid, its modal and Saved.
    void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.saved.list() });
    toast.success("Post deleted");
  };
  const remove = useAction(deletePostAction, {
    onNavigation: deleted,
    onSuccess() {
      deleted();
      onOpenChange(false);
      // Close the modal, then reload the page underneath from the server: going
      // back restores its old copy (e.g. a profile still counting the post).
      // (A tick later, so Next has finished going back before the refresh.)
      window.addEventListener("popstate", () => setTimeout(() => router.refresh()), {
        once: true,
      });
      router.back();
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
            onClick={() => remove.execute({ postId, fromModal: inModal })}
          >
            {remove.isPending && <Spinner aria-hidden data-icon="inline-start" />}
            {remove.isPending ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
