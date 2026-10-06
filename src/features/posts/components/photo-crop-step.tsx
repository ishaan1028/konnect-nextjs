"use client";

import { ZoomIn, ZoomOut } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { Area } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PixelArea } from "@/lib/canvas-image";

import { ASPECT_RATIOS, type AspectRatioId } from "../lib/process-photo";

// The cropper is the heaviest part of /create, and nobody needs it until a
// photo is picked, so it's split into its own chunk and loaded on demand.
// It renders inside a box that already has its final size: no layout shift.
const PhotoCropper = dynamic(() => import("./photo-cropper"), {
  loading: () => <Skeleton className="absolute inset-0 rounded-none" />,
});

type PhotoCropStepProps = {
  source: string;
  processing: boolean;
  onBack: () => void;
  onNext: (area: PixelArea, ratio: number) => void;
};

/**
 * Step 2: choose the shape (square, portrait, landscape), then drag to
 * position and zoom. The cropper is pointer-based; the shape buttons and the
 * zoom slider work from the keyboard, and "Next" accepts the centered crop.
 */
export function PhotoCropStep({ source, processing, onBack, onNext }: PhotoCropStepProps) {
  const [ratioId, setRatioId] = useState<AspectRatioId>("1:1");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const ratio = ASPECT_RATIOS.find(({ id }) => id === ratioId)!.value;

  return (
    <div className="space-y-5">
      <div className="relative aspect-square w-full overflow-hidden rounded-4xl bg-muted">
        <PhotoCropper
          image={source}
          crop={crop}
          zoom={zoom}
          aspect={ratio}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setArea(pixels)}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          aria-label="Shape"
          variant="outline"
          value={[ratioId]}
          // Pressing the selected shape again would deselect it; keep one selected.
          onValueChange={([next]) => next && setRatioId(next as AspectRatioId)}
        >
          {ASPECT_RATIOS.map(({ id, label }) => (
            <ToggleGroupItem key={id} value={id} aria-label={`${label} (${id})`}>
              {id}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex items-center gap-3 sm:w-56">
          <ZoomOut aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <Slider
            aria-label="Zoom"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onValueChange={(value) => setZoom(Array.isArray(value) ? (value[0] ?? 1) : value)}
          />
          <ZoomIn aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </div>
      </div>

      <div className="flex justify-between gap-3">
        <Button variant="outline" onClick={onBack} disabled={processing}>
          Choose another
        </Button>
        <Button onClick={() => area && onNext(area, ratio)} disabled={!area || processing}>
          {processing && <Spinner aria-hidden data-icon="inline-start" />}
          {processing ? "Preparing…" : "Next"}
        </Button>
      </div>
    </div>
  );
}
