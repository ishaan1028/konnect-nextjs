import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { lazyZodResolver } from "./lazy-zod-resolver";

const schema = z.object({ name: z.string().trim().min(1, "Enter a name") });
const options = { fields: {}, shouldUseNativeValidation: false };

describe("lazyZodResolver", () => {
  it("validates like zodResolver, loading the schema once", async () => {
    const load = vi.fn(async () => schema);
    const resolver = lazyZodResolver(load);

    expect((await resolver({ name: "" }, undefined, options)).errors.name?.message).toBe(
      "Enter a name",
    );
    expect((await resolver({ name: " Maya " }, undefined, options)).values).toEqual({
      name: "Maya",
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("tries again after a failed load", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(schema);
    const resolver = lazyZodResolver(load);

    await expect(resolver({ name: "Maya" }, undefined, options)).rejects.toThrow("offline");
    expect((await resolver({ name: "Maya" }, undefined, options)).values).toEqual({ name: "Maya" });
  });
});
