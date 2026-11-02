import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatedAmountConflicts,validatedDateConflicts} from '../src/lib/conflict-check';
import {evaluateFindings} from '../src/lib/llm';
const left={documentId:'primary',quote:'The service ended on 2026-10-08.'};
const right={documentId:'reply',quote:'The effective cancellation date is 2026-10-12.'};
const docs=[{id:'primary',text:left.quote},{id:'reply',text:right.quote}];
test('explicit conflicting dates retain both source identities',()=>assert.equal(validatedDateConflicts([{event:'effective_cancellation_date',left,right}],docs).length,1));
test('date conflict gate preserves custom restored document IDs',()=>{
 const primary={documentId:'original-bill-7',quote:'The service ended on 2026-10-08.'};
 const reply={documentId:'reply-version-3',quote:'The effective cancellation date is 2026-10-12.'};
 const conflicts=validatedDateConflicts([{event:'effective_cancellation_date',left:primary,right:reply}],[{id:primary.documentId,text:primary.quote},{id:reply.documentId,text:reply.quote}]);
 assert.equal(conflicts.length,1);
 assert.match(conflicts[0],/\[original-bill-7\].*\[reply-version-3\]/);
});
test('attempt and active account cannot become a conflict',()=>assert.deepEqual(validatedDateConflicts([{event:'effective_cancellation_date',left:{documentId:'primary',quote:'Cancellation requested on 2026-10-08.'},right:{documentId:'reply',quote:'Account active on 2026-10-10.'}}],[{id:'primary',text:'Cancellation requested on 2026-10-08.'},{id:'reply',text:'Account active on 2026-10-10.'}]),[]));
test('invented quotations and same-date pairs fail closed',()=>{
 assert.deepEqual(validatedDateConflicts([{event:'effective_cancellation_date',left,right}],[]),[]);
 assert.deepEqual(validatedDateConflicts([{event:'effective_cancellation_date',left,right:{...right,quote:left.quote}}],[...docs,{id:'reply',text:left.quote}]),[]);
});

const review=()=>evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
 primaryDocument:'2026-10-08 TX-1842 charge: USD 40.',
 companyResponse:'TX-1842 charge on 2026-10-08: USD 400.',
});
test('same transaction charge with a different amount is reported with exact source passages',async()=>{
 const result=await review();
 assert.equal(result.conflicts.length,1);
 assert.match(result.conflicts[0],/Primary document \[primary\].*2026-10-08 TX-1842 charge: USD 40\./);
 assert.match(result.conflicts[0],/Company response \[company-response\].*TX-1842 charge on 2026-10-08: USD 400\./);
});

test('amount-first text with a charge and refund is not a conflict',async()=>{
 const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
  primaryDocument:'USD 40 charge TX-1842 on 2026-10-08.',
  companyResponse:'USD 400 refund TX-1842 on 2026-10-08.',
 });
 assert.deepEqual(result.conflicts,[]);
});

test('different references on the same date are not a conflict',async()=>{
 const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
  primaryDocument:'2026-10-08 TX-1842 charge USD 40.',
  companyResponse:'2026-10-08 TX-1843 charge USD 400.',
 });
 assert.deepEqual(result.conflicts,[]);
});

test('missing anchors, different currencies, or different dates are not conflicts',async()=>{
 for(const [primaryDocument,companyResponse] of [
  ['USD 40.','USD 400.'],
  ['2026-10-08 TX-1842 charge USD 40.','2026-10-08 TX-1842 charge EUR 400.'],
  ['2026-10-08 TX-1842 charge USD 40.','2026-10-09 TX-1842 charge USD 400.'],
 ]) {
  const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{primaryDocument,companyResponse});
  assert.deepEqual(result.conflicts,[]);
 }
});

test('ambiguous or equal amounts on the same anchored event are not conflicts',async()=>{
 for(const [primaryDocument,companyResponse] of [
  ['2026-10-08 TX-1842 charge USD 40 and USD 60.','2026-10-08 TX-1842 charge USD 400.'],
  ['2026-10-08 TX-1842 charge USD 40.','2026-10-08 TX-1842 charge USD 40.00.'],
 ]) {
  const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{primaryDocument,companyResponse});
  assert.deepEqual(result.conflicts,[]);
 }
});

test('scalar facts cannot supply event anchors absent from the original primary source',async()=>{
 const result=await evaluateFindings({amount:40,currency:'USD',transactionReference:'TX-1842',chargeDate:'2026-10-08'},[],{evaluationPrompt:'Review.'},undefined,{
  primaryDocument:'The card was billed USD 40.',
  companyResponse:'2026-10-08 TX-1842 charge USD 400.',
 });
 assert.deepEqual(result.conflicts,[]);
});

test('additional exhibits retain their supplied identity and label',async()=>{
 const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
  primaryDocument:'2026-10-08 TX-1842 charge USD 40.',
  additionalDocuments:[{id:'exhibit-2',label:'Bank statement',text:'TX-1842 charge of USD 400 on 2026-10-08.'}],
 });
 assert.equal(result.conflicts.length,1);
 assert.match(result.conflicts[0],/Bank statement \[exhibit-2\] states “TX-1842 charge of USD 400 on 2026-10-08\.”/);
});

test('customer-record receipt is compared with company reply even when primary narrative has no event details',async()=>{
 const receipt='On 2026-10-08 the charge was USD 40, transaction reference TX-1842.';
 const reply='On 2026-10-08 the charge was USD 400, transaction reference TX-1842.';
 const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
  primaryDocument:'I dispute a subscription charge.',
  companyResponse:reply,
  companyResponseId:'company-answer-9',
  companyResponseLabel:'Company reply',
  additionalDocuments:[{id:'receipt-a',label:'Receipt A',role:'customer-record',text:receipt}],
 });
 assert.equal(result.conflicts.length,1);
 assert.match(result.conflicts[0],/Receipt A \[receipt-a\] states “On 2026-10-08 the charge was USD 40, transaction reference TX-1842\.”/);
 assert.match(result.conflicts[0],/Company reply \[company-answer-9\] states “On 2026-10-08 the charge was USD 400, transaction reference TX-1842\.”/);
});

test('customer-record receipt is compared with an explicitly typed previous company reply',async()=>{
 const receipt='On 2026-10-08 the charge was USD 40, transaction reference TX-1842.';
 const previousReply='On 2026-10-08 the charge was USD 400, transaction reference TX-1842.';
 const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
  primaryDocument:'I dispute a subscription charge.',
  additionalDocuments:[{id:'receipt-a',label:'Receipt A',role:'customer-record',text:receipt},{id:'reply-old-6',label:'Earlier company reply',role:'previous-company-reply',text:previousReply}],
 });
 assert.equal(result.conflicts.length,1);
 assert.match(result.conflicts[0],/Receipt A \[receipt-a\] states “On 2026-10-08 the charge was USD 40, transaction reference TX-1842\.”/);
 assert.match(result.conflicts[0],/Earlier company reply \[reply-old-6\] states “On 2026-10-08 the charge was USD 400, transaction reference TX-1842\.”/);
});

test('receipt comparisons fail closed when their explicit role is missing',async()=>{
 const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
  primaryDocument:'I dispute a subscription charge.',
  companyResponse:'2026-10-08 TX-1842 charge USD 400.',
  additionalDocuments:[{id:'legacy-receipt',label:'Legacy receipt',text:'2026-10-08 TX-1842 charge USD 40.'}],
 });
 assert.deepEqual(result.conflicts,[]);
});

test('receipt and reply pairs still require matching explicit event anchors and currency',async()=>{
 const receipt='2026-10-08 TX-1842 charge USD 40.';
 for(const companyResponse of [
  'USD 400.',
  '2026-10-08 TX-1843 charge USD 400.',
  '2026-10-08 TX-1842 refund USD 400.',
  '2026-10-08 TX-1842 charge EUR 400.',
 ]) {
  const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
   primaryDocument:'I dispute a subscription charge.',
   companyResponse,
   additionalDocuments:[{id:'receipt-a',label:'Receipt A',role:'customer-record',text:receipt}],
  });
  assert.deepEqual(result.conflicts,[]);
 }
});

test('each eligible unordered source pair is reported once while distinct receipts retain their evidence',async()=>{
 const receiptA='2026-10-08 TX-1842 charge USD 40.';
 const receiptB='On 2026-10-08 transaction TX-1842 was charged USD 40.';
 const reply='Charge USD 400 for TX-1842 on 2026-10-08.';
 const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
  primaryDocument:'I dispute a subscription charge.',
  companyResponse:reply,
  additionalDocuments:[
   {id:'receipt-a',label:'Receipt A',role:'customer-record',text:receiptA},
   {id:'receipt-b',label:'Receipt B',role:'customer-record',text:receiptB},
  ],
 });
 assert.equal(result.conflicts.length,2);
 assert.equal(result.conflicts.filter(conflict=>conflict.includes('Receipt A [receipt-a]')).length,1);
 assert.equal(result.conflicts.filter(conflict=>conflict.includes('Receipt B [receipt-b]')).length,1);
});

test('reference wording does not create phantom references',async()=>{
 const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
  primaryDocument:'2026-10-08 transaction reference TX-1842 charge USD 40.',
  companyResponse:'2026-10-08 transaction reference TX-1842 charge USD 400.',
 });
 assert.equal(result.conflicts.length,1);
});

test('refund wording does not create a phantom REF reference',async()=>{
 const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
  primaryDocument:'2026-10-08 TX-1842 refund USD 40.',
  companyResponse:'2026-10-08 TX-1842 refund USD 400.',
 });
 assert.equal(result.conflicts.length,1);
});

test('reference punctuation is preserved when comparing transaction identity',async()=>{
 const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
  primaryDocument:'2026-10-08 TX-A-12 charge USD 40.',
  companyResponse:'2026-10-08 TX-A12 charge USD 400.',
 });
 assert.deepEqual(result.conflicts,[]);
});

test('ambiguous dollar symbols do not establish a currency',async()=>{
 const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
  primaryDocument:'2026-10-08 TX-1842 charge $40.',
  companyResponse:'2026-10-08 TX-1842 charge $400.',
 });
 assert.deepEqual(result.conflicts,[]);
});

test('a dollar symbol is usable when its sentence explicitly establishes USD',async()=>{
 const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{
  primaryDocument:'2026-10-08 TX-1842 charge in USD: $40.',
  companyResponse:'2026-10-08 TX-1842 charge USD 400.',
 });
 assert.equal(result.conflicts.length,1);
});

test('overprecision and malformed grouping cannot be partially parsed as money',async()=>{
 for(const [primaryDocument,companyResponse] of [
  ['2026-10-08 TX-1842 charge USD 40.123.','2026-10-08 TX-1842 charge USD 41.00.'],
  ['2026-10-08 TX-1842 charge USD 1,2.','2026-10-08 TX-1842 charge USD 13.'],
 ]) {
  const result=await evaluateFindings({amount:40,currency:'USD'},[],{evaluationPrompt:'Review.'},undefined,{primaryDocument,companyResponse});
  assert.deepEqual(result.conflicts,[]);
 }
});

test('monetary conflicts stop at twenty details and include one omission notice',()=>{
 const primary=Array.from({length:30},(_,index)=>`2026-10-08 TX-${index+1} charge USD 40.`).join('\n');
 const reply=Array.from({length:30},(_,index)=>`2026-10-08 TX-${index+1} charge USD 400.`).join('\n');
 const conflicts=validatedAmountConflicts(primary,[{id:'reply',label:'Company reply',text:reply,role:'company-reply'}]);
 assert.equal(conflicts.filter(conflict=>conflict.startsWith('Amount conflict:')).length,20);
 assert.equal(conflicts.filter(conflict=>conflict.includes('conflicts were omitted')).length,1);
 assert.match(conflicts.at(-1) ?? '',/conflicts were omitted.*original records/i);
 assert.ok(conflicts.every(conflict=>conflict.length > 0));
});

test('monetary conflict text stays within budget without truncating source quotes',()=>{
 const filler=' supporting detail'.repeat(70);
 const primary=Array.from({length:20},(_,index)=>`2026-10-08 TX-${index+1} charge USD 40${filler}.`).join('\n');
 const reply=Array.from({length:20},(_,index)=>`2026-10-08 TX-${index+1} charge USD 400${filler}.`).join('\n');
 const conflicts=validatedAmountConflicts(primary,[{id:'reply',label:'Company reply',text:reply,role:'company-reply'}]);
 assert.ok(conflicts.reduce((total,conflict)=>total+conflict.length,0) <= 24_000);
 assert.ok(conflicts.some(conflict=>conflict.includes('conflicts were omitted')));
 for (const conflict of conflicts.filter(item=>item.startsWith('Amount conflict:'))) {
  assert.match(conflict,/states “2026-10-08 TX-\d+ charge USD 40 supporting detail/);
  assert.match(conflict,/states “2026-10-08 TX-\d+ charge USD 400 supporting detail/);
 }
});

test('an ordinary monetary conflict keeps its complete existing wording',()=>{
 const conflicts=validatedAmountConflicts('2026-10-08 TX-1842 charge: USD 40.',[{id:'reply',label:'Company response',text:'TX-1842 charge on 2026-10-08: USD 400.'}]);
 assert.deepEqual(conflicts,[`Amount conflict: Primary document [primary] states “2026-10-08 TX-1842 charge: USD 40.”; Company response [reply] states “TX-1842 charge on 2026-10-08: USD 400.”. Review the original documents; neither value is independently verified.`]);
});
