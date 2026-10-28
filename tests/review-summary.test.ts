import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewSummary } from '../src/lib/review-summary';
test('conflicts take priority over drafting',()=>{
 const r=buildReviewSummary({conflicts:['Dates differ'],unanswered:['When?'],warnings:[],sources:[]});
 assert.equal(r.nextAction,'Review the details');
 assert.match(r.explanation,/not a confirmed contradiction/);
});
test('summary bounds and deduplicates customer questions without hiding original evidence',()=>{
 const input={conflicts:[],unanswered:['a','a','b','c','d'],warnings:[],sources:[]};
 assert.deepEqual(buildReviewSummary(input).questions,['a','b','c']);
 assert.equal(input.unanswered.length,5);
 assert.match(buildReviewSummary(input).limitations[0],/No public sources/);
});

test('research status distinguishes snippets from page reading',()=>{
 const base={conflicts:[],unanswered:[],warnings:[]};
 const r=buildReviewSummary({...base,sources:[{id:'s1',title:'Policy',url:'https://example.com',snippet:'Text',retrievedAt:'2026-10-28',retrieval:'search_snippet'}]});
 assert.match(r.limitations.join(' '),/Search summaries only/);
});
