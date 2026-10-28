import type { PipelineResult } from './types';

export interface ReviewSummary {
  title: string;
  explanation: string;
  nextAction: string;
  questions: string[];
  limitations: string[];
}
/** A conservative decision layer: traceable quotes never imply entitlement. */
export function buildReviewSummary(result: Pick<PipelineResult, 'conflicts' | 'unanswered' | 'warnings' | 'sources'>): ReviewSummary {
  const conflict = result.conflicts.length > 0;
  const missing = result.unanswered.length > 0;
  return {
    title: conflict ? 'Check a point before replying.' : missing ? 'Ask for a clearer answer.' : 'Prepare a response you can review.',
    explanation: conflict ? 'The automated review raised a question about the record, not a confirmed contradiction. Different dates may describe different events; check the explanation before changing your account.' : missing ? 'The record leaves questions open. A focused reply can ask the company to explain them.' : 'Use the documented facts to explain your concern and ask the company to review it.',
    nextAction: conflict ? 'Review the details' : 'Prepare my reply',
    questions: [...new Set(result.unanswered)].slice(0, 3),
    limitations: !result.sources.length ? ['No public sources were found. This review is based on your supplied record.'] : result.sources.some(source => source.retrieval === 'provider_extract' && source.extractionStatus === 'extracted') ? ['Some web pages were read. Whether their rules apply to your case is still unconfirmed.'] : ['Search summaries only: full web pages were not read. Treat policy conclusions as unconfirmed.'],
  };
}
