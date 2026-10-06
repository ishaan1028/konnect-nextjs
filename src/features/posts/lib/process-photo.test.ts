import { describe, expect, it } from "vitest";

import { createPostSchema } from "../schemas";
import { ASPECT_RATIOS, outputSize } from "./process-photo";

describe("outputSize", () => {
  it("caps the width at 1080px and derives the height from the exact ratio", () => {
    expect(outputSize({ width: 3024 }, 4 / 5)).toEqual({ width: 1080, height: 1350 });
    expect(outputSize({ width: 4000 }, 1.91)).toEqual({ width: 1080, height: 565 });
  });

  it("never upscales a small crop", () => {
    expect(outputSize({ width: 640.4 }, 1)).toEqual({ width: 640, height: 640 });
  });

  it.each(ASPECT_RATIOS)("keeps $id inside the range the database accepts", ({ value }) => {
    // posts_image_aspect_ratio: width/height between 0.79 and 1.92.
    for (const width of [320, 321, 777, 1080, 5000]) {
      const size = outputSize({ width }, value);
      expect(size.width / size.height).toBeGreaterThanOrEqual(0.79);
      expect(size.width / size.height).toBeLessThanOrEqual(1.92);
    }
  });
});

describe("createPostSchema", () => {
  const valid = {
    path: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp",
    width: 1080,
    height: 1350,
    thumbhash: "HBkSHYSIeHiPiHh8eJd4eTN0EEQG",
    caption: "  Hello  ",
    altText: "",
    location: "",
  };

  it("accepts a well-formed post and trims the text", () => {
    expect(createPostSchema.parse(valid).caption).toBe("Hello");
  });

  it.each([
    ["a path outside a user folder", { path: "../etc/passwd.webp" }],
    ["a non-image extension", { path: valid.path.replace(".webp", ".svg") }],
    ["a photo narrower than 320px", { width: 300 }],
    ["a caption over 2200 characters", { caption: "x".repeat(2201) }],
  ])("rejects %s", (_, override) => {
    expect(createPostSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});
