/**
 * One-off: builds the seed photos in supabase/seed/photos/ from Lorem Picsum
 * (Unsplash photos, Unsplash License). Kept so the fixtures are reproducible:
 *
 *   node scripts/prepare-seed-photos.mjs
 *
 * Each photo goes through the same steps as a post made in the app: a center
 * crop to the post's shape, WebP at most 1080px wide, and a ThumbHash. The
 * crop/encode runs in Chromium (via Playwright), so no image library is needed.
 * Writes <name>.webp files and photos.json (sizes + ThumbHashes) next to them.
 */
import { writeFile } from "node:fs/promises";

import { chromium } from "@playwright/test";
import { rgbaToThumbHash } from "thumbhash";

const OUT = new URL("../supabase/seed/photos/", import.meta.url);
const RATIOS = { "1:1": 1, "4:5": 4 / 5, "1.91:1": 1.91 };

// [file name, Picsum id, shape]
const PHOTOS = [
  ["film-camera", 91, "4:5"],
  ["city-street", 57, "4:5"],
  ["quiet-alley", 1047, "1:1"],
  ["sea-sunset", 896, "1.91:1"],
  ["santorini", 49, "1:1"],
  ["fjord", 1015, "4:5"],
  ["cookies", 835, "1:1"],
  ["pour-over", 1060, "4:5"],
  ["cappuccino", 431, "1:1"],
  ["sketchbook", 20, "1:1"],
  ["coffee-red", 63, "4:5"],
  ["design-desk", 526, "1.91:1"],
  ["laptop-desk", 0, "1:1"],
  ["window-desk", 445, "4:5"],
];

const browser = await chromium.launch();
const page = await browser.newPage();
const manifest = {};

for (const [name, id, shape] of PHOTOS) {
  const source = await fetch(`https://picsum.photos/id/${id}/1600`);
  if (!source.ok) throw new Error(`Picsum ${id}: ${source.status}`);
  const bytes = Buffer.from(await source.arrayBuffer()).toString("base64");

  const result = await page.evaluate(
    async ({ bytes, ratio }) => {
      const image = new Image();
      image.src = `data:image/jpeg;base64,${bytes}`;
      await image.decode();
      // Center crop to the shape, then at most 1080px wide.
      const sourceRatio = image.naturalWidth / image.naturalHeight;
      const cropW = sourceRatio > ratio ? image.naturalHeight * ratio : image.naturalWidth;
      const cropH = cropW / ratio;
      const width = Math.min(1080, Math.round(cropW));
      const height = Math.round(width / ratio);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        (image.naturalWidth - cropW) / 2,
        (image.naturalHeight - cropH) / 2,
        cropW,
        cropH,
        0,
        0,
        width,
        height,
      );
      const webp = canvas.toDataURL("image/webp", 0.82).split(",")[1];
      // ≤100px RGBA for the ThumbHash (computed in Node below).
      const scale = 100 / Math.max(width, height);
      const small = document.createElement("canvas");
      small.width = Math.round(width * scale);
      small.height = Math.round(height * scale);
      small.getContext("2d").drawImage(canvas, 0, 0, small.width, small.height);
      const rgba = small.getContext("2d").getImageData(0, 0, small.width, small.height).data;
      return { webp, width, height, small: { w: small.width, h: small.height, rgba: [...rgba] } };
    },
    { bytes, ratio: RATIOS[shape] },
  );

  const file = Buffer.from(result.webp, "base64");
  await writeFile(new URL(`${name}.webp`, OUT), file);
  const hash = rgbaToThumbHash(result.small.w, result.small.h, result.small.rgba);
  manifest[name] = {
    width: result.width,
    height: result.height,
    thumbhash: Buffer.from(hash).toString("base64"),
  };
  console.log(
    `${name}.webp  ${result.width}x${result.height}  ${Math.round(file.length / 1024)} KB`,
  );
}

await writeFile(new URL("photos.json", OUT), `${JSON.stringify(manifest, null, 2)}\n`);
await browser.close();
