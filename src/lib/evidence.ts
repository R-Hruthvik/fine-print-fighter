import type { CaseScore, Finding, Source } from './types';

export function safeSourceURL(value: string): boolean {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

function findPassage(sourceText: string, passage: string): { start: number; end: number } | undefined {
  const normalizedPassage = normalize(passage);
  if (normalizedPassage.length < 12) return undefined;
  const escaped = normalizedPassage.split(' ').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  const match = new RegExp(escaped).exec(sourceText);
  return match?.index === undefined ? undefined : { start: match.index, end: match.index + match[0].length };
}

/** Traceability checks are deliberately separate from applicability review. */
export function verifyFindings(findings: Finding[], sources: Source[]): Finding[] {
  const registry = new Map(sources.map((source) => [source.id, source]));
  return findings.map((finding, index) => {
    const references = finding.sourceIds.map((id) => registry.get(id));
    const referencesValid = references.length > 0 && references.every((source) => source && safeSourceURL(source.url));
    const sourceMatches = references.flatMap((source, referenceIndex) => {
      if (!source) return [];
      const match = findPassage(source.snippet, finding.supportingPassage);
      return match ? [{ sourceId: finding.sourceIds[referenceIndex], ...match, offsetBasis: 'retained_source_text' as const }] : [];
    });
    const passageValid = sourceMatches.length === references.length && references.length > 0;
    const verified = referencesValid && passageValid;
    return {
      ...finding,
      id: `f${index + 1}`,
      verified,
      evidenceStatus: verified ? 'source_quote_matched' : 'source_quote_unmatched',
      claimRelation: 'unreviewed',
      sourceMatches: verified ? sourceMatches : [],
      applicability: 'unknown',
      verificationReason: !referencesValid
        ? 'One or more source references are missing or unsafe.'
        : !passageValid
          ? 'The supporting passage could not be matched in every cited source text. A search snippet may be the fallback when page extraction is unavailable.'
          : 'Quote matched in retained source text. Source authority, claim support, freshness, and applicability remain unreviewed.',
    };
  });
}

export function constrainScore(findings: Finding[], proposed?: Pick<CaseScore, 'rating' | 'reasons' | 'evidenceToGather'>): CaseScore {
  const backed = findings.filter((finding) => finding.verified);
  const coverage: CaseScore['coverage'] = !backed.length ? 'none' : 'limited';
  // Exact quotes and model-generated stance labels do not validate the relation
  // between a passage and a claim. Keep the score weak until that relation has
  // a separate reviewed evaluation.
  void proposed;
  return {
    rating: 'weak',
    coverage,
    reasons: [
      !backed.length ? 'No finding quotes could be traced to retained source text.' : `${backed.length} of ${findings.length} finding quote(s) match retained source text.`,
      'Claim relation is unreviewed. A matching quote does not establish whether it supports, opposes, or qualifies a claim.',
      'Source applicability is unknown; this evidence summary is not an eligibility or outcome assessment.',
    ],
    evidenceToGather: !backed.length
      ? ['The company terms or policy that applied when you purchased.', 'Receipts and your correspondence with the company.', 'A separate review of whether each source passage supports or qualifies a claim.']
      : ['The policy version and jurisdiction that apply to your dispute.', 'Any missing dates, receipts, or responses relevant to your claim.', 'A separate review of whether each source passage supports, opposes, or qualifies a claim.'],
  };
}

/** Registry order defines display markers; never accept model-generated URLs. */
export function resolveLetterCitations(letter: string, sources: Source[]): {id:number; title:string; url:string}[] {
  const ids = new Set(Array.from(letter.matchAll(/\[(\d+)\]/g), (match) => Number(match[1])));
  const citations = [];
  for (const id of ids) {
    const source = sources[id - 1];
    if (!source || !safeSourceURL(source.url)) throw new Error('The letter contains an unknown citation.');
    citations.push({id,title:source.title,url:source.url});
  }
  if (/\[s\d+\]/i.test(letter)) throw new Error('The letter contains an unresolved citation.');
  return citations.sort((a,b) => a.id-b.id);
}
