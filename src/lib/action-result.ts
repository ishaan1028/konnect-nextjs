/**
 * Server Actions built with next-safe-action *return* their errors
 * ({ serverError }, { validationErrors }) instead of throwing. TanStack Query
 * mutations need a thrown error to run onError / rollbacks, so this converts
 * one into the other.
 */
export function unwrapActionResult<TData>(
  result: { data?: TData; serverError?: string; validationErrors?: unknown } | undefined,
): TData {
  if (result?.serverError) throw new Error(result.serverError);
  if (result?.validationErrors) throw new Error("That request wasn't valid.");
  if (result?.data === undefined) throw new Error("Something went wrong. Please try again.");
  return result.data;
}
