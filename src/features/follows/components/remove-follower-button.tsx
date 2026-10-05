"use client";

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { useRemoveFollower } from "../hooks";

type RemoveFollowerButtonProps = {
  /** Whose followers list this is (the signed-in user). */
  profileId: string;
  follower: { id: string; username: string };
};

/** "Remove" with a confirmation, like Instagram. Destructive actions confirm first. */
export function RemoveFollowerButton({ profileId, follower }: RemoveFollowerButtonProps) {
  const remove = useRemoveFollower(profileId);
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            size="sm"
            variant="secondary"
            aria-label={`Remove @${follower.username} from your followers`}
            disabled={remove.isPending}
          />
        }
      >
        Remove
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove follower?</AlertDialogTitle>
          <AlertDialogDescription>
            Konnect won&apos;t tell @{follower.username} they were removed from your followers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              remove.mutate(follower.id);
              setOpen(false);
            }}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
