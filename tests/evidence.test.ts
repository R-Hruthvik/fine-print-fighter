import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { verifyFindings, constrainScore, resolveLetterCitations, safeSourceURL } from '../src/lib/evidence';
import type { Finding, Source } from '../src/lib/types';

const sources: Source[] = [{id:'s1',title:'Policy',url:'https://example.com/policy',snippet:'You may request a refund within 30 days. Keep your receipt.',retrievedAt:'2026-10-23',kind:'company policy'}];
const candidate = {id:'f1',statement:'A refund can be requested.',stance:'favors-customer' as const,sourceIds:['s1'],supportingPassage:'You may request a refund within 30 days.',verified:true};
test('invented quotes cannot become source-backed', () => {
  const [finding] = verifyFindings([{...candidate,supportingPassage:'Every customer is owed $500.'}], sources);
  assert.equal(finding.verified,false);
  assert.match(finding.verificationReason ?? '', /passage/i);
});
test('every cited source must exist even when one source is real', () => {
  assert.equal(verifyFindings([{...candidate,sourceIds:['s1','s999']}], sources)[0].verified,false);
});
test('traceability normalizes whitespace but does not establish applicability', () => {
  const [finding] = verifyFindings([{...candidate,supportingPassage:'You may request a refund\nwithin 30 days.'}], sources);
  assert.equal(finding.verified,true);
  assert.equal(finding.applicability,'unknown');
});
test('no evidence cannot have a strong rating', () => {
  const score = constrainScore([], {rating:'strong',reasons:['Looks good'],evidenceToGather:[]});
  assert.equal(score.rating,'weak');
  assert.equal(score.coverage,'none');
});
test('matching quotes and an optimistic model stance cannot raise the rating before claim relation review', () => {
  const finding: Finding = {...candidate, applicability:'supported', claimRelation:'unreviewed'};
  const score = constrainScore([finding], {rating:'strong',reasons:['Model proposed strong'],evidenceToGather:[]});
  assert.equal(score.rating,'weak');
  assert.equal(score.coverage,'limited');
  assert.match(score.reasons[0],/1 of 1/);
  assert.match(score.reasons[1],/claim relation is unreviewed/i);
});
test('opposing evidence caps even an explicitly applicable strong case', () => {
  const findings: Finding[] = [{...candidate,applicability:'supported'}, {...candidate,id:'f2',stance:'favors-company',applicability:'supported'}];
  assert.notEqual(constrainScore(findings,{rating:'strong',reasons:[],evidenceToGather:[]}).rating,'strong');
});
test('citations are created only from the registry and used markers', () => {
  assert.deepEqual(resolveLetterCitations('Please review your policy [1].',[sources[0]]),[{id:1,title:'Policy',url:'https://example.com/policy'}]);
  assert.throws(() => resolveLetterCitations('A made-up source [9].',sources),/citation/i);
  assert.equal(safeSourceURL('javascript:alert(1)'),false);
  assert.equal(safeSourceURL('https://example.com'),true);
});
