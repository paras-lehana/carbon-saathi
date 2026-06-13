/**
 * Bridge from core's zod schemas to the panels' field-error records: run
 * safeParse and key each issue's message by its first path segment. Typed
 * structurally against safeParse so this module adds no runtime dependency —
 * any schema exported by @carbon-saathi/core satisfies it.
 */

/** The slice of a zod schema this module needs (structural, version-proof). */
export interface FieldSchema {
  safeParse: (values: unknown) => {
    success: boolean;
    error?: {
      issues: ReadonlyArray<{ path: ReadonlyArray<string | number>; message: string }>;
    };
  };
}

/**
 * null when `values` passes; otherwise one message per offending field — the
 * first issue wins so errors read top-down as the schema declares them.
 */
export function fieldErrorsFromZod(
  schema: FieldSchema,
  values: unknown,
): Record<string, string> | null {
  const parsed = schema.safeParse(values);
  if (parsed.success) return null;
  const errors: Record<string, string> = {};
  for (const issue of parsed.error?.issues ?? []) {
    // Refinements without a path land under 'form' so no failure is silent.
    const key = issue.path.length > 0 ? String(issue.path[0]) : 'form';
    if (errors[key] === undefined) errors[key] = issue.message;
  }
  return errors;
}
