"use client";

import { ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";

import type { PixelArea } from "../lib/crop-image";

type AvatarCropDialogProps = {
  /** Object URL of the picked file; the dialog is open while it's set. */
  src: string | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (area: PixelArea) => void;
};

/**
 * Instagram-style circular crop: drag to position, slider or pinch to zoom.
 * The cropper is mouse/touch based; the zoom slider gives keyboard users
 * control, and "Save" works with the default centered crop.
 */
export function AvatarCropDialog({ src, saving, onCancel, onSave }: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  return (
    <Dialog
      open={src !== null}
      onOpenChange={(open) => {
        if (!open && !saving) onCancel();
      }}
    >
      <DialogContent showCloseButton={!saving} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop your photo</DialogTitle>
          <DialogDescription>Drag to reposition. Use the slider to zoom.</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-muted">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <ZoomOut aria-hidden className="size-4 text-muted-foreground" />
          <Slider
            aria-label="Zoom"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onValueChange={(value) => setZoom(Array.isArray(value) ? (value[0] ?? 1) : value)}
          />
          <ZoomIn aria-hidden className="size-4 text-muted-foreground" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => area && onSave(area)} disabled={!area || saving}>
            {saving && <Spinner aria-hidden data-icon="inline-start" />}
            {saving ? "Saving…" : "Save photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
