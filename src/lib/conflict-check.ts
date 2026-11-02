import { containsExactPassage } from './exact-passage';

export type ConflictDocument = { id: string; text: string };
export type AmountConflictDocument = { id: string; label: string; text: string };

type MonetaryStatement = {
  date: string;
  reference: string;
  event: 'charge' | 'refund';
  currency: string;
  amount: string;
  quote: string;
};

function statements(text: string): MonetaryStatement[] {
  const amounts = /\b(INR|USD|EUR|GBP|CAD|AUD)\s*([+-]?\d[\d,]*(?:\.\d{1,2})?)|([$€£₹]|Rs\.?)\s*([+-]?\d[\d,]*(?:\.\d{1,2})?)|([+-]?\d[\d,]*(?:\.\d{1,2})?)\s*(INR|USD|EUR|GBP|CAD|AUD)\b|([+-]?\d[\d,]*(?:\.\d{1,2})?)\s*([$€£₹]|Rs\.?)/gi;
  const result: MonetaryStatement[] = [];
  // Split lines first, then sentences. Decimal points remain inside the amount token.
  const passages = text.split(/\r?\n/).flatMap(line => line.split(/(?<=[.!?])\s+(?=[A-Z0-9])/));
  for (const passage of passages) {
    const quote = passage.trim();
    if (!quote) continue;
    const found = [...quote.matchAll(amounts)];
    if (found.length !== 1) continue;
    const dateMatches = [...quote.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)];
    if (dateMatches.length !== 1) continue;
    const date = dateMatches[0][1];
    const parsedDate = new Date(date);
    if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) continue;
    const references = [...quote.matchAll(/\b(?:TX|REF|INV|ORDER|PAYMENT)[-:#]?([A-Z0-9]+(?:-[A-Z0-9]+)*)\b/gi)];
    if (references.length !== 1) continue;
    const hasCharge = /\b(?:charge|charged|charging)\b/i.test(quote);
    const hasRefund = /\b(?:refund|refunded|refunding)\b/i.test(quote);
    if (hasCharge === hasRefund) continue;
    const match = found[0];
    const rawCurrency = match[1] ?? match[3] ?? match[6] ?? match[8];
    const rawAmount = match[2] ?? match[4] ?? match[5] ?? match[7];
    const currency = ({ '$': 'USD', '€': 'EUR', '£': 'GBP', '₹': 'INR', 'RS': 'INR', 'RS.': 'INR' } as Record<string, string>)[rawCurrency.toUpperCase()] ?? rawCurrency.toUpperCase();
    const numeric = Number(rawAmount.replace(/,/g, ''));
    if (!Number.isFinite(numeric)) continue;
    result.push({
      date,
      reference: references[0][0].toUpperCase().replace(/[-:#]/g, ''),
      event: hasCharge ? 'charge' : 'refund',
      currency,
      amount: numeric.toFixed(2),
      quote,
    });
  }
  return result;
}

/** Only reports differing amounts when both retained passages identify one same monetary event. */
export function validatedAmountConflicts(primaryText: string, supportingDocuments: AmountConflictDocument[]): string[] {
  const primaryStatements = statements(primaryText);
  const conflicts = new Set<string>();
  for (const document of supportingDocuments) {
    for (const primary of primaryStatements) {
      for (const supporting of statements(document.text)) {
        if (primary.date !== supporting.date || primary.reference !== supporting.reference || primary.event !== supporting.event || primary.currency !== supporting.currency || primary.amount === supporting.amount) continue;
        conflicts.add(`Amount conflict: Primary document [primary] states “${primary.quote}”; ${document.label} [${document.id}] states “${supporting.quote}”. Review the original documents; neither value is independently verified.`);
      }
    }
  }
  return [...conflicts];
}

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
