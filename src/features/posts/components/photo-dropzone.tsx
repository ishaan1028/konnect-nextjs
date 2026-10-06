"use client";

import { ImagePlus } from "lucide-react";
import { type ChangeEvent, type DragEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ACCEPTED_PHOTO_TYPES } from "../lib/process-photo";

/**
 * Step 1: drop a photo anywhere on the zone, or pick one with the button
 * (keyboard and screen-reader friendly; the file input itself is hidden).
 */
export function PhotoDropzone({ onPick }: { onPick: (file: File) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDragOver = (event: DragEvent) => {
    event.preventDefault(); // allow dropping
    setDragging(true);
  };
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    // Moving over a child element fires dragleave on the zone; ignore that.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onPick(file);
  };
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // picking the same file again still fires change
    if (file) onPick(file);
  };

  return (
    <div
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex aspect-square w-full flex-col items-center justify-center gap-5 rounded-4xl border-2 border-dashed p-8 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-muted text-foreground">
        <ImagePlus aria-hidden className="size-7" />
      </span>
      <div className="space-y-1">
        <p className="text-lg font-semibold">Drag a photo here</p>
        <p className="text-sm text-muted-foreground">JPEG, PNG, WebP or GIF, up to 20 MB</p>
      </div>
      <Button size="lg" onClick={() => fileInput.current?.click()}>
        Choose from your device
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED_PHOTO_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose a photo"
        onChange={onFileChange}
      />
    </div>
  );
}
