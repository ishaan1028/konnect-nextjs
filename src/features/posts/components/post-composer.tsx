"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { PixelArea } from "@/lib/canvas-image";

import {
  ACCEPTED_PHOTO_TYPES,
  MAX_SOURCE_BYTES,
  type ProcessedPhoto,
  processPhoto,
} from "../lib/process-photo";
import { PhotoCropStep } from "./photo-crop-step";
import { PhotoDropzone } from "./photo-dropzone";
import { PostDetailsStep } from "./post-details-step";

type Step =
  | { name: "pick" }
  | { name: "crop"; source: string }
  | { name: "details"; source: string; photo: ProcessedPhoto; preview: string };

/**
 * New post, in three steps: pick a photo → crop it → write the details and
 * share. Everything up to Share happens in the browser (nothing is uploaded
 * until then), so backing out costs nothing.
 */
export function PostComposer() {
  const [step, setStep] = useState<Step>({ name: "pick" });
  const [processing, setProcessing] = useState(false);

  // Object URLs pin the file in memory until revoked: release each one when
  // it's no longer shown (or when leaving the page).
  const source = step.name === "pick" ? null : step.source;
  const preview = step.name === "details" ? step.preview : null;
  useEffect(() => (source ? () => URL.revokeObjectURL(source) : undefined), [source]);
  useEffect(() => (preview ? () => URL.revokeObjectURL(preview) : undefined), [preview]);

  const onPick = (file: File) => {
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      toast.error("Please choose a JPEG, PNG, WebP or GIF image.");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast.error("That photo is over 20 MB. Please choose a smaller one.");
      return;
    }
    setStep({ name: "crop", source: URL.createObjectURL(file) });
  };

  const onCropped = async (area: PixelArea, ratio: number) => {
    if (step.name !== "crop") return;
    setProcessing(true);
    try {
      const photo = await processPhoto(step.source, area, ratio);
      setStep({
        name: "details",
        source: step.source,
        photo,
        preview: URL.createObjectURL(photo.blob),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't process that photo.");
    } finally {
      setProcessing(false);
    }
  };

  switch (step.name) {
    case "pick":
      return (
        <div className="mx-auto max-w-xl">
          <PhotoDropzone onPick={onPick} />
        </div>
      );
    case "crop":
      return (
        <div className="mx-auto max-w-xl">
          <PhotoCropStep
            source={step.source}
            processing={processing}
            onBack={() => setStep({ name: "pick" })}
            onNext={onCropped}
          />
        </div>
      );
    case "details":
      return (
        <PostDetailsStep
          photo={step.photo}
          preview={step.preview}
          onBack={() => setStep({ name: "crop", source: step.source })}
        />
      );
  }
}
