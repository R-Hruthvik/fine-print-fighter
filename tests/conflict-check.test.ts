import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatedDateConflicts} from '../src/lib/conflict-check';
const left={documentId:'primary',quote:'The service ended on 2026-10-08.'};
const right={documentId:'reply',quote:'The effective cancellation date is 2026-10-12.'};
const docs=[{id:'primary',text:left.quote},{id:'reply',text:right.quote}];
test('explicit conflicting dates retain both source identities',()=>assert.equal(validatedDateConflicts([{event:'effective_cancellation_date',left,right}],docs).length,1));
test('attempt and active account cannot become a conflict',()=>assert.deepEqual(validatedDateConflicts([{event:'effective_cancellation_date',left:{documentId:'primary',quote:'Cancellation requested on 2026-10-08.'},right:{documentId:'reply',quote:'Account active on 2026-10-10.'}}],[{id:'primary',text:'Cancellation requested on 2026-10-08.'},{id:'reply',text:'Account active on 2026-10-10.'}]),[]));
test('invented quotations and same-date pairs fail closed',()=>{
 assert.deepEqual(validatedDateConflicts([{event:'effective_cancellation_date',left,right}],[]),[]);
 assert.deepEqual(validatedDateConflicts([{event:'effective_cancellation_date',left,right:{...right,quote:left.quote}}],[...docs,{id:'reply',text:left.quote}]),[]);
});
