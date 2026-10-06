"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { queryKeys } from "@/lib/query/keys";
import { POSTS_BUCKET } from "@/lib/storage";
import { uploadWithProgress } from "@/lib/storage-upload";
import { createClient } from "@/lib/supabase/client";

import { createPostAction } from "../actions";
import type { ProcessedPhoto } from "../lib/process-photo";
import { type PostDetailsInput, postDetailsSchema } from "../schemas";
import { PostDetailsFields } from "./post-details-fields";

type PostDetailsStepProps = {
  photo: ProcessedPhoto;
  /** Object URL of the processed photo, for the preview. */
  preview: string;
  onBack: () => void;
};

/**
 * Step 3: caption, location and alt text, then Share:
 *
 *   upload the photo straight to Storage (with progress; RLS only allows
 *   posts/<your id>/…) → the Server Action verifies the path, saves the post
 *   and opens it.
 *
 * Uploading from the browser keeps large files off our server entirely.
 */
export function PostDetailsStep({ photo, preview, onBack }: PostDetailsStepProps) {
  const queryClient = useQueryClient();
  const form = useForm<PostDetailsInput>({
    resolver: zodResolver(postDetailsSchema),
    mode: "onTouched",
  });
  /** Upload progress (0–1) while sharing; null when idle. */
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createPost = useAction(createPostAction, {
    onNavigation() {
      // The action opened the new post; profile grids must include it.
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      toast.success("Your post is live");
    },
    onError({ error }) {
      setProgress(null);
      setError(error.serverError ?? "Couldn't share your post. Please try again.");
    },
  });

  const onSubmit = form.handleSubmit(async (details) => {
    setError(null);
    setProgress(0);
    try {
      const { data } = await createClient().auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) throw new Error("Your session has expired. Please log in again.");

      // A fresh random name per upload: its content never changes, so it can
      // be cached forever by browsers and the CDN.
      const path = `${userId}/${crypto.randomUUID()}.${photo.extension}`;
      await uploadWithProgress({
        bucket: POSTS_BUCKET,
        path,
        file: photo.blob,
        onProgress: setProgress,
      });

      createPost.execute({
        ...details,
        path,
        width: photo.width,
        height: photo.height,
        thumbhash: photo.thumbhash,
      });
    } catch (uploadError) {
      console.error(uploadError);
      setProgress(null);
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    }
  });

  const sharing = progress !== null || createPost.isPending;
  const uploaded = progress === 1;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
    >
      <div className="overflow-hidden rounded-4xl bg-muted">
        {/* A local blob: URL of the processed photo, which next/image can't load. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Preview of your photo"
          width={photo.width}
          height={photo.height}
          className="h-auto w-full"
        />
      </div>

      <div className="space-y-6">
        <FormAlert message={error} />
        <PostDetailsFields form={form} disabled={sharing} />

        {sharing && (
          <Progress value={Math.round((progress ?? 1) * 100)} className="gap-2">
            <ProgressLabel>{uploaded ? "Publishing…" : "Uploading photo…"}</ProgressLabel>
            <ProgressValue />
          </Progress>
        )}

        <div className="flex justify-between gap-3">
          <Button type="button" variant="outline" onClick={onBack} disabled={sharing}>
            Back
          </Button>
          <SubmitButton pending={sharing} pendingLabel="Sharing…" size="default" className="w-auto">
            Share
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
