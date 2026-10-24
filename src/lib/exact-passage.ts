const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

/** Checks traceability to supplied text. A match does not establish applicability or truth. */
export function containsExactPassage(sourceText: string, passage: string): boolean {
  const normalizedPassage = normalize(passage);
  return normalizedPassage.length >= 12 && normalize(sourceText).includes(normalizedPassage);
}
