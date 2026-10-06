"use client";

import { Ellipsis, Pencil, Trash2 } from "lucide-react";
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
import { DeletePostDialog } from "./delete-post-dialog";
import { EditPostDialog } from "./edit-post-dialog";

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

  if (user?.id !== authorId) return null;

  const onOpenChange = (open: boolean) => {
    if (!open) setDialog(null);
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
          <DropdownMenuItem onClick={() => setDialog("edit")}>
            <Pencil aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDialog("delete")}>
            <Trash2 aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditPostDialog
        postId={postId}
        authorId={authorId}
        details={details}
        open={dialog === "edit"}
        onOpenChange={onOpenChange}
      />
      <DeletePostDialog
        postId={postId}
        authorId={authorId}
        open={dialog === "delete"}
        onOpenChange={onOpenChange}
      />
    </>
  );
}
