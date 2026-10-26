import { strict as assert } from 'node:assert';
import { test, afterEach } from 'node:test';
import { llmJSON, ProviderError } from '../src/lib/provider';
import { researchWithWarnings } from '../src/lib/tavily';

const originalFetch = global.fetch;
const originalKey = process.env.NEBIUS_API_KEY;
const originalTavilyKey = process.env.TAVILY_API_KEY;
afterEach(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.NEBIUS_API_KEY; else process.env.NEBIUS_API_KEY=originalKey;
  if (originalTavilyKey === undefined) delete process.env.TAVILY_API_KEY; else process.env.TAVILY_API_KEY=originalTavilyKey;
});
const object = (value:unknown): value is {ok:boolean} => typeof value === 'object' && value !== null && 'ok' in value && typeof value.ok === 'boolean';
test('invalid provider JSON and schema are bounded to two attempts', async () => {
  process.env.NEBIUS_API_KEY='test';
  let calls=0;
  global.fetch=async () => {calls++;return Response.json({choices:[{message:{content:calls===1?'not json':'{"wrong":true}'}}]});};
  await assert.rejects(() => llmJSON({system:'system',user:'user'},'{ok:boolean}',object),/valid response/);
  assert.equal(calls,2);
});
test('provider errors never expose raw response contents', async () => {
  process.env.NEBIUS_API_KEY='test';
  global.fetch=async () => new Response('secret document or key',{status:401});
  await assert.rejects(() => llmJSON({system:'system',user:'user'},'{ok:boolean}',object), error => error instanceof ProviderError && error.status===502 && !error.message.includes('secret'));
});
test('missing configuration fails before calling fetch', async () => {
  delete process.env.NEBIUS_API_KEY;
  let calls=0;global.fetch=async () => {calls++;return Response.json({});};
  await assert.rejects(() => llmJSON({system:'system',user:'user'},'{}',object), error => error instanceof ProviderError && error.status===503);
  assert.equal(calls,0);
});
test('research deduplicates URLs while retaining query provenance', async () => {
  process.env.TAVILY_API_KEY='test';
  global.fetch=async (input) => String(input).endsWith('/extract')
    ? Response.json({results:[{url:'https://example.com/policy',raw_content:'Extracted page policy text, with more detail.'}],failed_results:[]})
    : Response.json({results:[{url:'https://example.com/policy#refunds',title:'Policy',content:'A useful policy.'}]});
  const result=await researchWithWarnings([{query:'refund policy',targets:'company policy'},{query:'refund rule',targets:'rules'}]);
  assert.equal(result.sources.length,1);
  assert.equal(result.sources[0].id,'s1');
  assert.equal(result.sources[0].queries?.length,2);
  assert.equal(result.sources[0].retrieval,'provider_extract');
  assert.equal(result.sources[0].authority,'unreviewed');
  assert.equal(result.sources[0].snippet,'Extracted page policy text, with more detail.');
});

test('page extraction is bounded and retains per-source snippet fallback', async () => {
  process.env.TAVILY_API_KEY='test';
  let requestedURLs:string[]=[];
  global.fetch=async (input,init) => {
    if (String(input).endsWith('/extract')) {
      const body=JSON.parse(String(init?.body)) as {urls:string[]};
      requestedURLs=body.urls;
      return Response.json({
        results:[{url:body.urls[0],raw_content:'The extracted page includes a traceable policy passage.'}],
        failed_results:[{url:body.urls[1],error:'unavailable'}],
      });
    }
    return Response.json({results:Array.from({length:5},(_,index)=>({url:`https://example.com/policy-${index}`,title:`Policy ${index}`,content:`Search snippet ${index} includes a useful policy passage.`}))});
  };
  const result=await researchWithWarnings([{query:'refund policy',targets:'company policy'}]);
  assert.equal(requestedURLs.length,3);
  assert.equal(result.sources.length,5);
  assert.equal(result.sources[0].extractionStatus,'extracted');
  assert.equal(result.sources[0].retrieval,'provider_extract');
  assert.equal(result.sources[1].extractionStatus,'failed');
  assert.equal(result.sources[1].extractionFailure,'unavailable');
  assert.match(result.sources[1].snippet,/Search snippet 1/);
  assert.equal(result.sources[2].extractionStatus,'failed');
  assert.equal(result.sources[3].extractionStatus,'not_selected');
  assert.ok(result.warnings.some(warning=>/fallback/i.test(warning)));
});

test('page extraction is marked skipped when Tavily key is absent', async () => {
  delete process.env.TAVILY_API_KEY;
  global.fetch=async () => Response.json({results:[{url:'https://example.com/policy',title:'Policy',content:'A useful policy snippet.'}]});
  const result=await researchWithWarnings([{query:'refund policy',targets:'company policy'}]);
  assert.equal(result.sources[0].extractionStatus,'skipped_no_key');
  assert.equal(result.sources[0].retrieval,'search_snippet');
  assert.equal(result.sources[0].authority,'unreviewed');
  assert.ok(result.warnings.some(warning=>/skipped/i.test(warning)));
});
test('research outage is distinct from zero results', async () => {
  process.env.TAVILY_API_KEY='test';
  global.fetch=async () => new Response('private details',{status:503});
  const result=await researchWithWarnings([{query:'refund policy',targets:'rules'}]);
  assert.equal(result.sources.length,0);
  assert.ok(result.warnings.some(warning => /unavailable/i.test(warning)));
  assert.ok(result.warnings.every(warning => !warning.includes('private')));
});

test('valid JSON with wrong field types is repaired once and checked again', async () => {
  process.env.NEBIUS_API_KEY='test';
  let calls=0;
  global.fetch=async () => {calls++;return Response.json({choices:[{message:{content:JSON.stringify(calls===1 ? {ok:'yes'} : {ok:true})}}]});};
  assert.deepEqual(await llmJSON({system:'system',user:'user'},'{ok:boolean}',object),{ok:true});
  assert.equal(calls,2);
});
