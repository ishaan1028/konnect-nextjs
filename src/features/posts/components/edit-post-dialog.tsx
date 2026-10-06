"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useFormState } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { queryKeys } from "@/lib/query/keys";

import { updatePostAction } from "../actions";
import { type PostDetailsInput, postDetailsSchema } from "../schemas";
import { PostDetailsFields } from "./post-details-fields";

type EditPostDialogProps = {
  postId: string;
  authorId: string;
  details: PostDetailsInput;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditPostDialog({ open, onOpenChange, ...props }: EditPostDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit post</DialogTitle>
          <DialogDescription>
            The photo stays the same; change the words around it.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted per opening, so it always starts from the post's current text. */}
        {open && <EditPostForm {...props} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditPostForm({
  postId,
  authorId,
  details,
  onDone,
}: Omit<EditPostDialogProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const queryClient = useQueryClient();
  // Starting values are set once (see ProfileSettingsForm for why).
  const [initial] = useState(details);

  const { form, action, handleSubmitWithAction } = useHookFormAction(
    // The post id travels as a bound argument, validated on the server.
    updatePostAction.bind(null, postId),
    zodResolver(postDetailsSchema),
    {
      formProps: { mode: "onTouched", defaultValues: initial },
      actionProps: {
        onSuccess() {
          // The page re-renders with the new text (updateTag); the grid's
          // alt text comes from the client cache, so refresh that too.
          void queryClient.invalidateQueries({ queryKey: queryKeys.posts.byAuthor(authorId) });
          toast.success("Post updated");
          onDone();
        },
      },
    },
  );
  const { isDirty } = useFormState({ control: form.control });

  return (
    <form onSubmit={handleSubmitWithAction} noValidate className="space-y-6">
      <FormAlert message={action.result.serverError} />
      <PostDetailsFields form={form} initial={initial} disabled={action.isPending} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={action.isPending}>
          Cancel
        </Button>
        <SubmitButton
          pending={action.isPending}
          pendingLabel="Saving…"
          size="default"
          className="w-auto"
          disabled={!isDirty || action.isPending}
        >
          Save
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
