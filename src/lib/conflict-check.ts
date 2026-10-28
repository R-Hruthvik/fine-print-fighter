import { containsExactPassage } from './exact-passage';

export type ConflictDocument = { id: string; text: string };
/** Narrow, deterministic gate. Only explicit effective-date assertions qualify. */
export function validatedDateConflicts(pairs: unknown, documents: ConflictDocument[]): string[] {
  if (!Array.isArray(pairs)) return [];
  const registry = new Map(documents.map(d => [d.id, d.text]));
  return pairs.slice(0, 10).flatMap(pair => {
    if (!pair || typeof pair !== 'object' || pair.event !== 'effective_cancellation_date') return [];
    const sides = [pair.left, pair.right];
    if (sides.some(s => !s || typeof s.documentId !== 'string' || typeof s.quote !== 'string')) return [];
    if (sides[0].documentId === sides[1].documentId) return [];
    const dates = sides.map(side => {
      const original = registry.get(side.documentId);
      if (!original || !containsExactPassage(original, side.quote)) return undefined;
      // The date must follow an explicit effective-termination assertion, not a request/reply date.
      const match = side.quote.match(/(?:effective cancellation date\s*(?:is|was|:)\s*|(?:service|subscription|membership) ended on\s*)(\d{4}-\d{2}-\d{2})\b/i);
      if (!match) return undefined;
      const date = new Date(match[1]);
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === match[1] ? match[1] : undefined;
    });
    if (!dates[0] || !dates[1] || dates[0] === dates[1]) return [];
    return [`Different effective cancellation dates are stated: ${dates[0]} [${sides[0].documentId}] and ${dates[1]} [${sides[1].documentId}]. Check the original records; neither statement is independently verified.`];
  });
}
