"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { deleteAccountAction } from "../actions";
import { deleteAccountSchema } from "../schemas";

/**
 * "Delete account", confirmed by typing your username (a click alone is too
 * easy for something that can't be undone).
 */
export function DeleteAccountDialog({ username }: { username: string }) {
  const queryClient = useQueryClient();
  const { form, action, handleSubmitWithAction } = useHookFormAction(
    deleteAccountAction,
    zodResolver(deleteAccountSchema),
    {
      actionProps: {
        // The action signs out and redirects to /login. Drop every cached
        // query on the way, so nothing of the deleted account stays in memory.
        onNavigation() {
          queryClient.clear();
          toast.success("Your account was deleted");
        },
      },
    },
  );
  const typed = useWatch({ control: form.control, name: "username" }) ?? "";
  const confirmed = typed.trim().toLowerCase() === username;

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) form.reset();
      }}
    >
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Delete account
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form onSubmit={handleSubmitWithAction} noValidate className="grid gap-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile, posts, photos, likes, comments and follows are deleted for good. Your
              messages stay in other people&apos;s chats, from a &ldquo;Deleted user&rdquo;. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FormAlert message={action.result.serverError} />
          <TextField
            form={form}
            name="username"
            label={`Type ${username} to confirm`}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={action.isPending}>Cancel</AlertDialogCancel>
            <SubmitButton
              variant="destructive"
              size="default"
              className=""
              pending={action.isPending}
              pendingLabel="Deleting…"
              disabled={!confirmed || action.isPending}
            >
              Delete account
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
