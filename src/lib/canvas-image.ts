/*
 * Browser-only image helpers shared by the avatar and post editors.
 * Everything happens in the browser: a multi-MB phone photo becomes a small
 * WebP before upload, which saves the user's data plan and our storage.
 */

export type PixelArea = { x: number; y: number; width: number; height: number };

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Couldn't read that image."));
    image.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Encodes a canvas as WebP. Browsers that can't encode WebP silently return
 * PNG from toBlob(), so the result is checked and JPEG is the fallback.
 */
export async function encodeCanvas(
  canvas: HTMLCanvasElement,
): Promise<{ blob: Blob; extension: "webp" | "jpg" }> {
  const webp = await toBlob(canvas, "image/webp", 0.85);
  if (webp?.type === "image/webp") return { blob: webp, extension: "webp" };

  const jpeg = await toBlob(canvas, "image/jpeg", 0.9);
  if (!jpeg) throw new Error("Couldn't process that image.");
  return { blob: jpeg, extension: "jpg" };
}

/** Draws `area` of `image` onto a new canvas of the given size. */
export function drawArea(
  image: CanvasImageSource,
  area: PixelArea,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser can't process images.");
  context.imageSmoothingQuality = "high";
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, width, height);
  return canvas;
}
