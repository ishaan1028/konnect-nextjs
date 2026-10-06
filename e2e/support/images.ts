import type { Page } from "@playwright/test";

/**
 * A gradient PNG drawn in the browser, so no binary fixtures live in the repo.
 * Defaults to 400×300; posts need at least 320px of width after cropping.
 */
export async function makePng(page: Page, width = 400, height = 300): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext("2d")!;
      const gradient = context.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, "#22c55e");
      gradient.addColorStop(1, "#7c3aed");
      context.fillStyle = gradient;
      context.fillRect(0, 0, w, h);
      return canvas.toDataURL("image/png");
    },
    [width, height] as const,
  );
  return Buffer.from(dataUrl.split(",")[1]!, "base64");
}
