export const INITIAL_REPLY = `Dear Meridian Cable,

I am writing in response to your denial dated March 28, 2025.

I asked to cancel my service by email on March 4, 2025, and again through the customer portal on March 12, 2025. Please confirm which request counts as the effective cancellation date.

Your March bill includes a charge I have disputed. Please explain how that disputed March charge was calculated.

Thank you,
[Your name]`;

// Coherent fictional Meridian Cable cancellation case shared by the letter,
// the three questions, and any edited reply. Dates and amounts are fictional
// and agree across the sample; no disputed charge amount is invented.
export const QUESTIONS: readonly {
  id: string;
  title: string;
  note: string;
  text: string;
}[] = [
  {
    id: 'q-effective-date',
    title: 'Effective cancellation date',
    note:
      'You asked to cancel by email on March 4, 2025 and again through the customer portal on March 12, 2025. Which date should count as the effective cancellation date?',
    text:
      'Please confirm the effective cancellation date: is it the March 4, 2025 email request or the March 12, 2025 portal request?',
  },
  {
    id: 'q-terms-version',
    title: 'Terms and version applied',
    note:
      'Which agreement terms and version apply to your account, and do they cover the cancellation you requested?',
    text: 'Please confirm which agreement terms and version were applied to my account.',
  },
  {
    id: 'q-charge-calculation',
    title: 'Charge calculation',
    note:
      'The March charge on my bill is disputed. Please explain how that charge was calculated before it can be resolved.',
    text: 'Please explain how the disputed March charge was calculated.',
  },
];

/**
 * Append one question's wording to a draft reply, once, preserving all user
 * edits exactly. Unknown or already-added IDs leave every value unchanged.
 * Neither input is mutated.
 */
export function appendQuestion(
  draft: string,
  addedIds: readonly string[],
  questionId: string,
): { draft: string; addedIds: readonly string[] } {
  const question = QUESTIONS.find((q) => q.id === questionId);
  if (!question || addedIds.includes(questionId)) {
    return { draft, addedIds };
  }
  const closing = /\n\n(?=(?:Thank you|Thanks|Sincerely|Regards|Best regards),?\s*\n)/i.exec(draft);
  const nextDraft = closing
    ? draft.slice(0, closing.index) + '\n\n' + question.text + draft.slice(closing.index)
    : draft.length === 0 ? question.text : draft + '\n' + question.text;
  return { draft: nextDraft, addedIds: [...addedIds, questionId] };
}

/**
 * Count words in a text block. Empty or whitespace-only text counts as zero.
 * Mixed whitespace (spaces, tabs, newlines) is treated as word separators.
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) {
    return 0;
  }
  return text.trim().split(/\s+/).length;
}
