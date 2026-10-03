"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { type ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/query/keys";
import { AVATARS_BUCKET, avatarUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

import { removeAvatarAction, updateAvatarAction } from "../actions";
import { cropToSquare, type PixelArea } from "../lib/crop-image";
import type { CurrentUser } from "../queries";
import { AvatarCropDialog } from "./avatar-crop-dialog";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
// No HEIC: most browsers can't decode it (iOS converts to JPEG when picking for upload).
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type AvatarEditorProps = {
  userId: string;
  fullName: string;
  avatarPath: string | null;
};

/**
 * Change or remove your profile photo.
 *
 *   pick file → crop in the browser → upload to Storage *directly* (RLS only
 *   allows avatars/<your id>/…) → Server Action saves the path (after
 *   verifying it) and deletes the old file → cache + page update.
 *
 * Uploading straight to Storage keeps large files off our server entirely.
 */
export function AvatarEditor({ userId, fullName, avatarPath: initialPath }: AvatarEditorProps) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [avatarPath, setAvatarPath] = useState(initialPath);
  const [source, setSource] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onSaved = (profile: CurrentUser) => {
    setAvatarPath(profile.avatarPath);
    // The nav avatar reads this cache, so it updates without a refetch.
    queryClient.setQueryData(queryKeys.currentUser, profile);
  };

  const update = useAction(updateAvatarAction, {
    onSuccess: ({ data }) => {
      if (data) onSaved(data.profile);
      toast.success("Profile photo updated");
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't save your photo."),
  });

  const remove = useAction(removeAvatarAction, {
    onSuccess: ({ data }) => {
      if (data) onSaved(data.profile);
      toast.success("Profile photo removed");
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't remove your photo."),
  });

  const closeCropper = () => {
    if (source) URL.revokeObjectURL(source);
    setSource(null);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again later
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please choose a JPEG, PNG, WebP or GIF image.");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast.error("That image is over 10 MB. Please choose a smaller one.");
      return;
    }
    setSource(URL.createObjectURL(file));
  };

  const onCropSave = async (area: PixelArea) => {
    if (!source) return;
    setUploading(true);
    try {
      const { blob, extension } = await cropToSquare(source, area);
      // A fresh random name per upload: the URL never changes content, so it
      // can be cached forever by browsers and the CDN.
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;

      const { error } = await createClient()
        .storage.from(AVATARS_BUCKET)
        .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
      if (error) throw error;

      await update.executeAsync({ path });
      closeCropper();
    } catch (error) {
      console.error(error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const busy = uploading || update.isPending || remove.isPending;

  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border bg-card p-6 sm:flex-row">
      <UserAvatar
        name={fullName}
        src={avatarUrl(avatarPath)}
        pixelSize={80}
        className="size-20"
        fallbackClassName="text-2xl"
      />
      <div className="flex flex-1 flex-col items-center gap-3 sm:items-start">
        <div className="text-center sm:text-left">
          <p className="font-semibold">Profile photo</p>
          <p className="text-sm text-muted-foreground">JPEG, PNG, WebP or GIF, up to 10 MB.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => fileInput.current?.click()} disabled={busy}>
            <Camera aria-hidden data-icon="inline-start" />
            {avatarPath ? "Change photo" : "Upload photo"}
          </Button>
          {avatarPath && (
            <Button size="sm" variant="ghost" onClick={() => remove.execute()} disabled={busy}>
              <Trash2 aria-hidden data-icon="inline-start" />
              Remove
            </Button>
          )}
        </div>
        {/* Visually hidden; the "Change photo" button opens it. */}
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a profile photo"
          onChange={onFileChange}
        />
      </div>

      <AvatarCropDialog
        // A new key per image resets the crop and zoom.
        key={source ?? "closed"}
        src={source}
        saving={busy}
        onCancel={closeCropper}
        onSave={onCropSave}
      />
    </div>
  );
}
