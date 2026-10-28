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
    title: conflict ? 'Clarify the record before replying.' : missing ? 'Ask for a clearer answer.' : 'Prepare a response you can review.',
    explanation: conflict ? 'Some details in the record may disagree. Check the dates and amounts before relying on a draft.' : missing ? 'The record leaves questions open. A focused reply can ask the company to explain them.' : 'Use the documented facts to explain your concern and ask the company to review it.',
    nextAction: conflict ? 'Review the details' : 'Prepare my reply',
    questions: [...new Set(result.unanswered)].slice(0, 3),
    limitations: result.sources.length ? ['Research can be incomplete. A matching quotation does not establish that a rule applies to your case.'] : ['No public sources were found. This review is based on your supplied record.'],
  };
}
