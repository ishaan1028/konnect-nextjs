"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { useToggleSave } from "../hooks";
import { savedStatusQueryOptions } from "../queries";

/**
 * The bookmark: saves the post to your private Saved list. A toggle (the name
 * stays "Save", aria-pressed says whether it's on). Signed-in viewers only.
 */
export function SaveButton({ postId, initial }: { postId: string; initial?: boolean }) {
  const { data: saved } = useSuspenseQuery({
    ...savedStatusQueryOptions(createClient(), postId),
    ...(initial === undefined ? {} : { initialData: initial }),
  });
  const toggle = useToggleSave(postId);

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label="Save"
      aria-pressed={saved}
      onClick={() => toggle.mutate(!saved)}
    >
      <Bookmark aria-hidden className={cn("size-6", saved && "fill-current")} />
    </Button>
  );
}
