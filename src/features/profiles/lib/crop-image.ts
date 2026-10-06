import { drawArea, encodeCanvas, loadImage, type PixelArea } from "@/lib/canvas-image";

export type { PixelArea } from "@/lib/canvas-image";

export const AVATAR_OUTPUT_SIZE = 512;

/**
 * Crops `area` out of the image and scales it to a square `size`×`size` file:
 * a multi-MB phone photo becomes a ~30-60 KB WebP before upload.
 */
export async function cropToSquare(
  src: string,
  area: PixelArea,
  size = AVATAR_OUTPUT_SIZE,
): Promise<{ blob: Blob; extension: "webp" | "jpg" }> {
  const image = await loadImage(src);
  return encodeCanvas(drawArea(image, area, size, size));
}
