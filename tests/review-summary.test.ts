import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewSummary } from '../src/lib/review-summary';
test('conflicts take priority over drafting',()=>{
 const r=buildReviewSummary({conflicts:['Dates differ'],unanswered:['When?'],warnings:[],sources:[]});
 assert.equal(r.nextAction,'Review the details');
 assert.match(r.explanation,/disagree/);
});
test('summary bounds and deduplicates customer questions without hiding original evidence',()=>{
 const input={conflicts:[],unanswered:['a','a','b','c','d'],warnings:[],sources:[]};
 assert.deepEqual(buildReviewSummary(input).questions,['a','b','c']);
 assert.equal(input.unanswered.length,5);
 assert.match(buildReviewSummary(input).limitations[0],/No public sources/);
});
