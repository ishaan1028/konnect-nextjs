import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

/**
 * `zodResolver(schema)`, but Zod (~105 KB gzipped: it bundles every locale)
 * and the schema load on the form's first validation instead of with the
 * page, so forms add nothing to first paint. Pass a loader that imports the
 * schema: `lazyZodResolver(() => import("../schemas").then((m) => m.signInSchema))`.
 * The Server Action still validates with the same schema.
 */
export function lazyZodResolver<Input extends FieldValues, Output>(
  loadSchema: () => Promise<ZodType<Output, Input>>,
): Resolver<Input, unknown, Output> {
  let resolver: Promise<Resolver<Input, unknown, Output>> | undefined;
  return async (...args) => {
    const loading = (resolver ??= Promise.all([
      import("@hookform/resolvers/zod"),
      loadSchema(),
    ]).then(
      ([{ zodResolver }, schema]) => zodResolver<Input, unknown, Output>(schema),
      (error: unknown) => {
        // A failed download (offline) shouldn't break the form for good.
        resolver = undefined;
        throw error;
      },
    ));
    return (await loading)(...args);
  };
}
