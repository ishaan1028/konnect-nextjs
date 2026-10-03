export type PixelArea = { x: number; y: number; width: number; height: number };

export const AVATAR_OUTPUT_SIZE = 512;

function loadImage(src: string): Promise<HTMLImageElement> {
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
 * Crops `area` out of the image and scales it to a square `size`×`size` file.
 *
 * Everything happens in the browser: a multi-MB phone photo becomes a ~30-60 KB
 * WebP before upload, which saves the user's data plan and our storage.
 * Browsers that can't encode WebP silently return PNG from toBlob(), so we
 * check the result and fall back to JPEG.
 */
export async function cropToSquare(
  src: string,
  area: PixelArea,
  size = AVATAR_OUTPUT_SIZE,
): Promise<{ blob: Blob; extension: "webp" | "jpg" }> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser can't process images.");
  context.imageSmoothingQuality = "high";
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);

  const webp = await toBlob(canvas, "image/webp", 0.85);
  if (webp?.type === "image/webp") return { blob: webp, extension: "webp" };

  const jpeg = await toBlob(canvas, "image/jpeg", 0.9);
  if (!jpeg) throw new Error("Couldn't process that image.");
  return { blob: jpeg, extension: "jpg" };
}
