"use client";

import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/features/profiles/hooks";

import type { PostDetailsInput } from "../schemas";

// Only the author ever opens these (and rarely), so their code (forms,
// validation) loads on first open instead of with every post page.
const EditPostDialog = dynamic(() => import("./edit-post-dialog").then((m) => m.EditPostDialog));
const DeletePostDialog = dynamic(() =>
  import("./delete-post-dialog").then((m) => m.DeletePostDialog),
);

type PostOwnerMenuProps = {
  postId: string;
  authorId: string;
  details: PostDetailsInput;
};

/**
 * Edit / Delete for the post's author (nothing for anyone else). Render inside
 * a CurrentUserBoundary. The database enforces the same rule: this menu is
 * convenience, not security.
 */
export function PostOwnerMenu({ postId, authorId, details }: PostOwnerMenuProps) {
  const user = useCurrentUser();
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  // Each dialog mounts on its first opening and stays (so it can animate out).
  const [opened, setOpened] = useState({ edit: false, delete: false });

  if (user?.id !== authorId) return null;

  const open = (which: "edit" | "delete") => {
    setOpened((previous) => ({ ...previous, [which]: true }));
    setDialog(which);
  };
  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) setDialog(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label="Post options" />}
        >
          <Ellipsis aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => open("edit")}>
            <Pencil aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => open("delete")}>
            <Trash2 aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {opened.edit && (
        <EditPostDialog
          postId={postId}
          details={details}
          open={dialog === "edit"}
          onOpenChange={onOpenChange}
        />
      )}
      {opened.delete && (
        <DeletePostDialog postId={postId} open={dialog === "delete"} onOpenChange={onOpenChange} />
      )}
    </>
  );
}
