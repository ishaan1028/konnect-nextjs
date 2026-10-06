import { rgbaToThumbHash } from "thumbhash";

import { drawArea, encodeCanvas, loadImage, type PixelArea } from "@/lib/canvas-image";
import { bytesToBase64 } from "@/lib/thumbhash";

import { MIN_PHOTO_WIDTH } from "../schemas";

/** Instagram's three shapes. The database accepts exactly this range. */
export const ASPECT_RATIOS = [
  { id: "1:1", label: "Square", value: 1 },
  { id: "4:5", label: "Portrait", value: 4 / 5 },
  { id: "1.91:1", label: "Landscape", value: 1.91 },
] as const;

export type AspectRatioId = (typeof ASPECT_RATIOS)[number]["id"];

// No HEIC: most browsers can't decode it (iOS converts to JPEG when picking for upload).
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/** Photos are stored at most this wide (Instagram's size): sharp, yet small. */
export const MAX_PHOTO_WIDTH = 1080;

export type ProcessedPhoto = {
  blob: Blob;
  extension: "webp" | "jpg";
  width: number;
  height: number;
  thumbhash: string | null;
};

/**
 * The stored photo's size: the crop's width (never upscaled), capped at 1080px,
 * with the height derived from the exact ratio so it matches what was chosen.
 */
export function outputSize(area: Pick<PixelArea, "width">, ratio: number) {
  const width = Math.min(MAX_PHOTO_WIDTH, Math.round(area.width));
  return { width, height: Math.round(width / ratio) };
}

/** ThumbHash wants a tiny (≤100px) version of the image. */
function computeThumbhash(source: HTMLCanvasElement): string | null {
  const scale = 100 / Math.max(source.width, source.height);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const small = drawArea(source, { x: 0, y: 0, ...sizeOf(source) }, width, height);
  const pixels = small.getContext("2d")?.getImageData(0, 0, width, height);
  return pixels ? bytesToBase64(rgbaToThumbHash(width, height, pixels.data)) : null;
}

const sizeOf = (canvas: HTMLCanvasElement) => ({ width: canvas.width, height: canvas.height });

/**
 * Crops and resizes the photo in the browser, encodes it as WebP (a 5 MB
 * phone photo becomes ~150-300 KB) and computes its blurred preview.
 */
export async function processPhoto(
  src: string,
  area: PixelArea,
  ratio: number,
): Promise<ProcessedPhoto> {
  const { width, height } = outputSize(area, ratio);
  if (width < MIN_PHOTO_WIDTH) {
    throw new Error(`That crop is too small. Use a photo at least ${MIN_PHOTO_WIDTH}px wide.`);
  }

  const image = await loadImage(src);
  const canvas = drawArea(image, area, width, height);
  const { blob, extension } = await encodeCanvas(canvas);
  return { blob, extension, width, height, thumbhash: computeThumbhash(canvas) };
}
