import {strict as assert} from 'node:assert';
import {test,afterEach} from 'node:test';
import {planQueries,extractFacts,evaluateFindings,draftLetter,escalateLadder} from '../src/lib/llm';
import type { Source } from '../src/lib/types';
const oldFetch=global.fetch;
const oldKey=process.env.NEBIUS_API_KEY;
afterEach(() => {global.fetch=oldFetch;if(oldKey===undefined)delete process.env.NEBIUS_API_KEY;else process.env.NEBIUS_API_KEY=oldKey;});
const source:Source={id:'s1',title:'Policy',url:'https://example.com/policy',snippet:'Customers may request a review of their disputed charges.',retrievedAt:'2026-10-23',retrieval:'provider_extract'};

test('search planning excludes private document fields and unsafe entity strings',async () => {
  global.fetch=async () => {throw new Error('Planner must not send full facts to a provider');};
  const queries=await planQueries({company:'jane@example.com account 12345678',userName:'Jane Private',address:'123 Secret Street',account:'12345678',disputeSummary:'Sensitive details'},'IN',{searchPlan:{queries:['{company} {country} refund policy','{company} complaints']}});
  assert.equal(queries.length,2);
  assert.ok(queries.every(query => !/Jane|Private|123|Secret|Sensitive|@/i.test(query.query)));
});
test('extraction normalizes missing fields and drops invented quotations',async () => {
  process.env.NEBIUS_API_KEY='test';
  global.fetch=async () => Response.json({choices:[{message:{content:JSON.stringify({company:'Example',amount:'not stated',companyPosition:['invented quote','No refund.']})}}]});
  const facts=await extractFacts('Example says: No refund.',{id:'surprise-bill',name:'Bill',extractionSchema:['company','amount','date']});
  assert.equal(facts.amount,null);assert.equal(facts.date,null);
  assert.deepEqual(facts.companyPosition,['No refund.']);
});
test('evaluation rejects model verified flags when passages are invented',async () => {
  process.env.NEBIUS_API_KEY='test';
  global.fetch=async () => Response.json({choices:[{message:{content:JSON.stringify({findings:[{statement:'An automatic refund is owed.',stance:'favors-customer',sourceIds:['s1'],supportingPassage:'Automatic refunds are mandatory.',verified:true}],unverified:[],unanswered:[],conflicts:[]})}}]});
  const result=await evaluateFindings({},[source],{evaluationPrompt:'Evaluate billing.'});
  assert.equal(result.findings[0].verified,false);
  assert.equal(result.unverified.length,1);
});
test('factual draft cannot invent legal claims even when the model would hallucinate',async () => {
  process.env.NEBIUS_API_KEY='test';
  let calls=0;
  global.fetch=async () => {calls++;return Response.json({choices:[{message:{content:JSON.stringify({letter:'You are legally entitled to $500 under statute [9].'})}}]});};
  const result=await draftLetter({company:'Example',amount:'₹1,200',disputeSummary:'You are entitled to $500'},[],{},{letterTemplate:'Assert legal rights',escalationLadder:{IN:['Invented court']}},'Jane','Review the fee','English','14 days',[source]);
  assert.equal(calls,0);
  assert.ok(result.letter.includes('Jane'));
  assert.ok(result.letter.includes('Review the fee'));
  assert.ok(result.letter.includes('14 days'));
  assert.ok(result.letter.includes('₹1,200'));
  assert.ok(!result.letter.includes('$500'));
  assert.ok(!result.letter.includes('Invented court'));
  assert.deepEqual(result.citations,[]);
});
test('factual draft quotes only matched passages and asks the company to confirm applicability',async () => {
  const finding={id:'f1',statement:'Invented entitlement to $500',stance:'favors-customer' as const,sourceIds:['s1'],supportingPassage:source.snippet,verified:true};
  const result=await draftLetter({},[finding],{},{letterTemplate:'Facts',escalationLadder:{}},'not supplied','a review','French','14 days',[source]);
  assert.ok(result.letter.includes(source.snippet));
  assert.ok(result.letter.includes('Please confirm whether this information applies to my case.'));
  assert.ok(result.letter.includes('[Your name]'));
  assert.ok(!result.letter.includes('$500'));
  assert.deepEqual(result.citations,[{id:1,title:source.title,url:source.url}]);
});
test('search planning blocks segmented phone numbers and street addresses in entity fields',async () => {
  const result=await planQueries({company:'Jane Doe 123 Main Street 555-123-4567'},'US',{searchPlan:{queries:['{company} {country} policy']}});
  assert.equal(result[0].query,'company US policy');
});
test('extraction rejects entities and fields not grounded in original document',async () => {
  process.env.NEBIUS_API_KEY='test';
  global.fetch=async () => Response.json({choices:[{message:{content:JSON.stringify({company:'Invented Corp',amount:500,disputeSummary:'The fee appears disputed',companyPosition:[]})}}]});
  const facts=await extractFacts('Example charged a fee.',{id:'surprise-bill',name:'Bill',extractionSchema:['company','amount']});
  assert.equal(facts.company,null);assert.equal(facts.amount,null);
  assert.match(String(facts.disputeSummary),/^Inferred summary:/);
});
test('escalation uses only the selected scope and preserves unreviewed status',async () => {
  const steps=await escalateLadder({escalationLadder:{IN:['Indian candidate'],US:['American candidate']}},'IN',[source]);
  assert.equal(steps.length,1);assert.equal(steps[0].body,'Indian candidate');
  assert.equal(steps[0].provenance,'unreviewed-pack');assert.equal(steps[0].applicability,'unknown');assert.equal(steps[0].sourceId,undefined);
});

test('duplicate quoted passages retain every used source citation marker',async () => {
  const second={...source,id:'s2',url:'https://example.org/policy'};
  const finding={id:'f1',statement:'Policy excerpt',stance:'unclear' as const,supportingPassage:source.snippet,verified:true};
  const result=await draftLetter({},[{...finding,sourceIds:['s1']},{...finding,id:'f2',sourceIds:['s2']}],{},{letterTemplate:'Facts',escalationLadder:{}},'Jane','review','English','14 days',[source,second]);
  assert.equal(result.citations.length,2);
  assert.ok(result.citations.every(citation => result.letter.includes(`[${citation.id}]`)));
});

test('literal user and source text cannot introduce apparent citation markers',async () => {
  const markedSource={...source,snippet:'Customers may request a review [999] of disputed charges [s99].'};
  const finding={id:'f1',statement:'Review policy',stance:'unclear' as const,sourceIds:['s1'],supportingPassage:markedSource.snippet,verified:true};
  const result=await draftLetter({company:'Example [123]',amount:'500 [s7]'},[finding],{},{letterTemplate:'Facts',escalationLadder:{}},'Jane [999]','Review [33]','English','14 days [s4]',[markedSource]);
  const markers=Array.from(result.letter.matchAll(/\[(s?\d+)\]/gi),match => match[1]);
  assert.deepEqual(markers,['1']);
  assert.ok(result.letter.includes('Jane ［999］'));
  assert.ok(result.letter.includes('review ［999］'));
  assert.ok(result.letter.includes('500 ［s7］'));
  assert.ok(result.letter.includes('Review ［33］'));
  assert.ok(result.letter.includes('14 days ［s4］'));
  assert.deepEqual(result.citations,[{id:1,title:source.title,url:source.url}]);
});

test('numeric grounding accepts sentence punctuation without accepting a truncated decimal',async () => {
  process.env.NEBIUS_API_KEY='test';
  global.fetch=async () => Response.json({choices:[{message:{content:JSON.stringify({amount:1200,currency:'INR',companyPosition:[]})}}]});
  const pack={id:'surprise-bill' as const,name:'Bill',extractionSchema:['amount','currency']};
  assert.equal((await extractFacts('Example charged INR 1200.',pack)).amount,1200);
  assert.equal((await extractFacts('Example charged INR 1200.50.',pack)).amount,null);
  assert.equal((await extractFacts('Example charged INR 1200,50.',pack)).amount,null);
  assert.equal((await extractFacts('Example charged INR 1,200.',pack)).amount,1200);
});

test('numeric grounding cannot turn a negative balance into a positive charge',async () => {
  process.env.NEBIUS_API_KEY='test';
  let amount=1200;
  global.fetch=async () => Response.json({choices:[{message:{content:JSON.stringify({amount,companyPosition:[]})}}]});
  const pack={id:'surprise-bill' as const,name:'Bill',extractionSchema:['amount']};
  assert.equal((await extractFacts('Example balance INR -1200.',pack)).amount,null);
  assert.equal((await extractFacts('Example balance INR −1200.',pack)).amount,null);
  assert.equal((await extractFacts('Example balance INR - 1200.',pack)).amount,null);
  amount=-1200;
  assert.equal((await extractFacts('Example balance INR -1200.',pack)).amount,-1200);
  assert.equal((await extractFacts('Example balance INR −1200.',pack)).amount,-1200);
});
