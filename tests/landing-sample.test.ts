import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  INITIAL_REPLY,
  QUESTIONS,
  appendQuestion,
  countWords,
} from '../src/components/landing/sample';

test('countWords returns zero for empty and whitespace-only text', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords('   '), 0);
  assert.equal(countWords('\t\n  \t'), 0);
  assert.equal(countWords(' '), 0);
});

test('countWords counts words separated by mixed whitespace', () => {
  assert.equal(countWords('one two three'), 3);
  assert.equal(countWords('one\ttwo\nthree'), 3);
  assert.equal(countWords('  leading and trailing  '), 3);
  assert.equal(countWords('one   two\t\tthree\nfour'), 4);
});

test('QUESTIONS contains the three expected Meridian Cable cancellation questions', () => {
  assert.equal(QUESTIONS.length, 3);
  const titles = QUESTIONS.map((q) => q.title);
  assert.match(titles.join(' | '), /effective cancellation date/i);
  assert.match(titles.join(' | '), /terms.*version/i);
  assert.match(titles.join(' | '), /charge/i);
  for (const question of QUESTIONS) {
    assert.equal(typeof question.id, 'string');
    assert.equal(typeof question.title, 'string');
    assert.equal(typeof question.note, 'string');
    assert.equal(typeof question.text, 'string');
  }
});

test('INITIAL_REPLY is the consumer\'s reply to Meridian Cable', () => {
  assert.match(INITIAL_REPLY, /Meridian Cable/i);
  assert.match(INITIAL_REPLY, /denial dated March 28, 2025/i);
  assert.match(INITIAL_REPLY, /March 4, 2025/i);
  assert.match(INITIAL_REPLY, /March 12, 2025/i);
  assert.match(INITIAL_REPLY, /disputed March charge/i);
  assert.match(INITIAL_REPLY, /I asked to cancel/i);
  assert.equal(INITIAL_REPLY.includes('$'), false);
  // The fictional label belongs in the surrounding UI, not in the letter text.
  assert.equal(INITIAL_REPLY.toLowerCase().includes('fictional'), false);
});

test('INITIAL_REPLY speaks in the consumer voice and does not pose as Meridian Cable', () => {
  // Written by the consumer TO Meridian Cable, responding to its denial.
  assert.match(INITIAL_REPLY, /I asked to cancel my service/i);
  assert.match(INITIAL_REPLY, /charge I have disputed/i);
  assert.match(INITIAL_REPLY, /denial dated March 28, 2025/i);
  // Must not speak as the company ("Thank you for writing to Meridian Cable").
  assert.equal(INITIAL_REPLY.includes('Thank you for writing to Meridian Cable'), false);
  // No invented amount and no legal-disclaimer paragraph in the letter itself.
  assert.equal(INITIAL_REPLY.includes('$'), false);
  assert.equal(INITIAL_REPLY.includes('This reply makes no legal promises'), false);
});

test('appendQuestion appends the question wording once to an edited draft', () => {
  const edited = INITIAL_REPLY + '\nPlease also refund my deposit.';
  const result = appendQuestion(edited, [], QUESTIONS[0].id);
  assert.ok(result.draft.indexOf(QUESTIONS[0].text) < result.draft.indexOf('Thank you,'));
  assert.ok(result.draft.endsWith('[Your name]\nPlease also refund my deposit.')); 
  assert.equal(result.addedIds.length, 1);
  assert.equal(result.addedIds[0], QUESTIONS[0].id);
});

test('appendQuestion preserves exact user edits without trimming', () => {
  const edited = '  keep my leading spaces and trailing   ';
  const result = appendQuestion(edited, [], QUESTIONS[1].id);
  assert.match(result.draft, /^  keep my leading spaces and trailing   \n/);
});

test('appendQuestion duplicate id changes nothing', () => {
  const draft = 'some draft';
  const added = [QUESTIONS[0].id];
  const result = appendQuestion(draft, added, QUESTIONS[0].id);
  assert.equal(result.draft, draft);
  assert.deepEqual(result.addedIds, added);
});

test('appendQuestion unknown id changes nothing', () => {
  const draft = 'some draft';
  const result = appendQuestion(draft, [], 'no-such-id');
  assert.equal(result.draft, draft);
  assert.deepEqual(result.addedIds, []);
});

test('appendQuestion does not mutate its inputs', () => {
  const draft = 'a draft';
  const added = [QUESTIONS[2].id];
  const beforeDraft = draft;
  const beforeAdded = [...added];
  appendQuestion(draft, added, QUESTIONS[0].id);
  assert.equal(draft, beforeDraft);
  assert.deepEqual(added, beforeAdded);
});

test('appendQuestion returns a new addedIds array when appending', () => {
  const added = ['q-other'];
  const result = appendQuestion('draft', added, QUESTIONS[0].id);
  assert.notEqual(result.addedIds, added);
  assert.equal(result.addedIds.length, 2);
});

test('appendQuestion with empty draft yields just the question text', () => {
  const result = appendQuestion('', [], QUESTIONS[2].id);
  assert.equal(result.draft, QUESTIONS[2].text);
  assert.equal(result.addedIds.length, 1);
});

test('new question goes before the closing while preserving edits', () => {
  const draft = 'Dear team,\n\nMy edited request.\n\nThank you,\nAlex\n';
  const result = appendQuestion(draft, [], QUESTIONS[1].id);
  assert.equal(result.draft, 'Dear team,\n\nMy edited request.\n\n' + QUESTIONS[1].text + '\n\nThank you,\nAlex\n');
});
