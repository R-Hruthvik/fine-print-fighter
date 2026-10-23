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

/** Traceability checks are deliberately separate from applicability review. */
export function verifyFindings(findings: Finding[], sources: Source[]): Finding[] {
  const registry = new Map(sources.map((source) => [source.id, source]));
  return findings.map((finding, index) => {
    const references = finding.sourceIds.map((id) => registry.get(id));
    const passage = normalize(finding.supportingPassage);
    const referencesValid = references.length > 0 && references.every((source) => source && safeSourceURL(source.url));
    const passageValid = passage.length >= 12 && references.every((source) => source && normalize(source.snippet).includes(passage));
    const verified = referencesValid && passageValid;
    return {
      ...finding,
      id: `f${index + 1}`,
      verified,
      applicability: 'unknown',
      verificationReason: !referencesValid
        ? 'One or more source references are missing or unsafe.'
        : !passageValid
          ? 'The supporting passage could not be matched in every cited source.'
          : 'Passage matched in the retained source text. Applicability and claim interpretation still need review.',
    };
  });
}

export function constrainScore(findings: Finding[], proposed?: Pick<CaseScore, 'rating' | 'reasons' | 'evidenceToGather'>): CaseScore {
  const backed = findings.filter((finding) => finding.verified);
  const favorable = backed.filter((finding) => finding.stance === 'favors-customer');
  const opposing = backed.filter((finding) => finding.stance === 'favors-company');
  const applicable = favorable.some((finding) => finding.applicability === 'supported');
  const coverage = !backed.length ? 'none' : backed.length === findings.length && applicable ? 'sufficient' : 'limited';
  const ceiling: CaseScore['rating'] = !favorable.length ? 'weak' : applicable && !opposing.length ? 'strong' : 'medium';
  const rank = {weak:0,medium:1,strong:2};
  const rating = proposed && rank[proposed.rating] < rank[ceiling] ? proposed.rating : ceiling;
  return {
    rating,
    coverage,
    reasons: [
      !backed.length ? 'No findings could be traced to retained source passages.' : `${backed.length} finding(s) have matching source passages.`,
      opposing.length ? 'The available evidence includes points that favor the company.' : favorable.length ? 'Some evidence may support your position.' : 'The evidence does not currently establish support for your request.',
      applicable ? 'This describes the evidence available, not a prediction of the outcome.' : 'Source applicability remains uncertain; a matching quote does not establish entitlement.',
    ],
    evidenceToGather: !backed.length
      ? ['The company terms or policy that applied when you purchased.', 'Receipts and your correspondence with the company.']
      : ['The policy version and jurisdiction that apply to your dispute.', 'Any missing dates, receipts, or responses relevant to your claim.'],
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
