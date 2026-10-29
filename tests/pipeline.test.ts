import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { classifySourceProfiles, runPipeline } from "../src/lib/pipeline";
import { getPack, registerPacks } from "../src/lib/packs";
import { extractFacts } from "../src/lib/llm";
import { describeRemedy } from "../src/lib/pipeline";
import { normalizeScopeAnswers } from "../src/lib/scope-answers";
import { getSourceProfile } from "../src/lib/source-registry";
import type { Source } from "../src/lib/types";

const fetchOriginal = global.fetch;
const originalNebius = process.env.NEBIUS_API_KEY;
const originalTavily = process.env.TAVILY_API_KEY;
afterEach(() => {
  global.fetch = fetchOriginal;
  if (originalNebius === undefined) delete process.env.NEBIUS_API_KEY; else process.env.NEBIUS_API_KEY = originalNebius;
  if (originalTavily === undefined) delete process.env.TAVILY_API_KEY; else process.env.TAVILY_API_KEY = originalTavily;
});

test("pack registry rejects duplicates and invalid configuration", () => {
  const pack = getPack("flight-delay")!;
  assert.throws(() => registerPacks([pack, pack]), /Duplicate/);
  assert.throws(() => registerPacks([{ ...pack, requiredFacts: 1 }]), /Invalid/);
  assert.equal(getPack("constructor"), undefined);
});

test("grounded numeric charges retain explicitly stated currency through extraction and remedy display", async () => {
  process.env.NEBIUS_API_KEY = "test";
  global.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify({ company: "Example", amount: 1200, currency: "INR", companyPosition: [] }) } }] });
  const facts = await extractFacts("Example charged INR 1200.", getPack("surprise-bill")!);
  const remedy = describeRemedy(facts);
  assert.equal(remedy.disputedAmount, 1200);
  assert.equal(remedy.currency, "INR");
  assert.equal(remedy.amount, undefined);
  assert.equal(remedy.noAmountFound, true);
});

test("unconfigured analysis stops before any paid provider calls", async () => {
  delete process.env.NEBIUS_API_KEY;
  delete process.env.TAVILY_API_KEY;
  let calls = 0;
  global.fetch = async () => { calls++; return Response.json({}); };
  await assert.rejects(runPipeline({ documentText: "My bill", pack: getPack("surprise-bill")!, country: "IN" }), (e: unknown) => !!e && typeof e === "object" && "status" in e && e.status === 503);
  assert.equal(calls, 0);
});

test("cancelled analysis never starts provider requests", async () => {
  process.env.NEBIUS_API_KEY = "test";
  process.env.TAVILY_API_KEY = "test";
  let calls = 0;
  global.fetch = async () => { calls++; return Response.json({}); };
  const controller = new AbortController(); controller.abort();
  await assert.rejects(runPipeline({ documentText: "My bill", pack: getPack("surprise-bill")!, country: "IN", signal: controller.signal }));
  assert.equal(calls, 0);
});

test("remedy preserves a charge without claiming a refund entitlement or guessing currency", async () => {
  process.env.NEBIUS_API_KEY = "test";
  process.env.TAVILY_API_KEY = "test";
  const outputs = [
    { company: "Example", amount: "₹1,200", disputeSummary: "Disputed fee", companyPosition: [] },
    { tool_calls: [{ id: "finish-1", type: "function", function: { name: "finish_investigation", arguments: JSON.stringify({ objections: [] }) } }] },
    { findings: [], unverified: ["Fee eligibility unknown"], unanswered: ["What sector?"], conflicts: [] },
    { letter: "Please review the disputed fee. [Customer name]", citations: [] },
  ];
  global.fetch = async (input) => {
    if (String(input).includes("tavily")) return Response.json({ results: [{ url: "https://example.com/policy", title: "Policy", content: "Please contact the company about disputed charges." }] });
    const output = outputs.shift();
    if (!output) throw new Error("Unexpected model call");
    const message = "tool_calls" in output ? output : { content: JSON.stringify(output) };
    return Response.json({ choices: [{ message }] });
  };
  const result = await runPipeline({ documentText: "Example fee ₹1,200", pack: getPack("surprise-bill")!, country: "IN", requestId: "fixture-run" });
  assert.equal(result.compensation.amount, undefined);
  assert.equal(result.compensation.disputedAmount, undefined);
  assert.equal(result.compensation.noAmountFound, true);
  assert.equal(result.score.coverage, "none");
  assert.equal(result.score.rating, "weak");
  assert.ok(result.unanswered.includes("What sector?"));
  assert.ok(result.unverified.includes("Fee eligibility unknown"));
  assert.ok(result.warnings.length > 0);
  assert.equal(result.run.requestId, "fixture-run");
  assert.equal(result.country, "IN");
  assert.ok(result.escalation.every(step => step.applicability === "unknown"));
});

test("empty required evidence arrays stay unanswered", async () => {
  process.env.NEBIUS_API_KEY = "test";
  process.env.TAVILY_API_KEY = "test";
  global.fetch = async input => String(input).includes("tavily")
    ? Response.json({ results: [] })
    : Response.json({ choices: [{ message: { content: JSON.stringify({ company: "Example", cancellationAttempts: [], chargesAfterCancellation: [], companyPosition: [] }) } }] });
  const result = await runPipeline({ documentText: "Example", pack: getPack("subscription-cancel")!, country: "US" });
  assert.ok(result.unanswered.some(question => /confirm cancellation attempts/i.test(question)));
  assert.ok(result.unanswered.some(question => /confirm charges after cancellation/i.test(question)));
});

test("all launch packs and scopes return cited factual letters and preserve conflicts without asserting applicability", async () => {
  process.env.NEBIUS_API_KEY = "test";
  process.env.TAVILY_API_KEY = "test";
  for (const packId of ["flight-delay", "subscription-cancel", "surprise-bill"]) {
    for (const country of ["IN", "EU", "US"] as const) {
      let extraction = true;
      global.fetch = async input => {
        if (String(input).includes("tavily")) return Response.json({ results: [{ url: "https://example.com/policy", title: "Published policy", content: "Customers can request a review of disputed charges." }] });
        const output = extraction
          ? { company: "Example", airline: "Example", amount: 1200, currency: "INR", companyPosition: [] }
          : { findings: [{ statement: "A published review process may support the request", stance: "favors-customer", sourceIds: ["s1"], supportingPassage: "Customers can request a review of disputed charges." }], unverified: ["Eligibility not determined"], unanswered: ["Which policy version applies?"], conflicts: ["The document and policy may describe different terms."] };
        extraction = false;
        return Response.json({ choices: [{ message: { content: JSON.stringify(output) } }] });
      };
      const result = await runPipeline({ documentText: "Example billed INR 1200.", pack: getPack(packId)!, country });
      assert.equal(result.findings[0].verified, true);
      assert.equal(result.findings[0].applicability, "unknown");
      assert.equal(result.score.rating, "weak");
      assert.deepEqual(result.letterCitations, []);
      assert.doesNotMatch(result.letter, /Customers can request a review of disputed charges/);
      assert.equal(result.conflicts.length, 0);
      assert.ok(result.unverified.some(item => item.includes("different terms")));
      assert.equal(result.country, country);
    }
  }
});

test("user-entered scope answers are kept distinct, used in searches, and remain unverified", async () => {
  process.env.NEBIUS_API_KEY = "test";
  process.env.TAVILY_API_KEY = "test";
  const pack = getPack("flight-delay")!;
  let extraction = true;
  global.fetch = async input => {
    if (String(input).includes("tavily")) return Response.json({ results: [] });
    const output = extraction
      ? { company: "Air India", airline: "Air India", companyPosition: [] }
      : { findings: [], unverified: [], unanswered: [], conflicts: [] };
    extraction = false;
    return Response.json({ choices: [{ message: { content: JSON.stringify(output) } }] });
  };
  const scopeAnswers = normalizeScopeAnswers("flight-delay", {
    operatingCarrier: "Air India", origin: "Delhi", destination: "London", eventDate: "2026-10-25",
    timeline: "The flight departed six hours late.",
  });
  const result = await runPipeline({ documentText: "Flight was delayed.", pack, country: "IN", companyName: "Air India", scopeAnswers });
  assert.equal(result.scopeAnswers?.answers.find(answer => answer.key === "origin")?.provenance, "user_answer");
  assert.ok(result.queries.every(query => /Delhi|London|2026-10-25/.test(query)));
  assert.ok(result.warnings.some(warning => /user-entered/i.test(warning)));
});

test("source authority is assigned only by exact reviewed pages or a matching listed company domain", () => {
  const pack = getPack("flight-delay")!;
  const exact = getSourceProfile("flight-delay", "IN")!.sources[0].url;
  const sources: Source[] = [
    { id: "s1", url: exact + "#page", title: "DGCA", snippet: "Regulator page.", retrievedAt: "2026-10-26" },
    { id: "s2", url: "https://www.dgca.gov.in/another-page", title: "Other page", snippet: "Not in registry.", retrievedAt: "2026-10-26" },
    { id: "s3", url: "https://www.airindia.com/terms", title: "Air India", snippet: "Company page.", retrievedAt: "2026-10-26" },
  ];
  classifySourceProfiles(sources, pack, "IN", "Air India");
  assert.equal(sources[0].authority, "regulator");
  assert.equal(sources[0].jurisdiction, "IN");
  assert.equal(sources[1].authority, "unreviewed");
  assert.equal(sources[2].authority, "official_company");
  assert.equal(sources[2].jurisdiction, "IN");
  assert.ok(sources.every(source => source.freshness === "unknown"));
  const unlisted: Source[] = [{ ...sources[2], id: "s4" }];
  classifySourceProfiles(unlisted, pack, "IN", "Unlisted Air Service");
  assert.equal(unlisted[0].authority, "unreviewed");
});

test('investigation reserves a final turn after four source inspections', async () => {
  process.env.NEBIUS_API_KEY='test';
  const { investigateObjections }=await import('../src/lib/rebuttal');
  let calls=0;
  global.fetch=async()=>{
    calls++;
    const tool_calls=calls===1 ? [1,2,3,4].map(n=>({id:`inspect-${n}`,type:'function',function:{name:'inspect_source',arguments:JSON.stringify({sourceId:'s1'})}})) : [{id:'finish',type:'function',function:{name:'finish_investigation',arguments:JSON.stringify({objections:[{hypothesis:'Policy may require confirmation',supportingPassage:'Cancellation needs confirmation.',sourceIds:['s1'],evidenceNeeded:['Confirmation']} ]})}}];
    return Response.json({choices:[{message:{tool_calls}}]});
  };
  const result=await investigateObjections({facts:{company:'Example'},companyResponse:'Account active',country:'US',officialCompanyDomain:'example.com',additionalDocuments:[],sources:[{id:'s1',title:'Policy',url:'https://example.com',snippet:'Cancellation needs confirmation.',retrievedAt:new Date().toISOString()}]});
  assert.equal(calls,2);
  assert.equal(result.objections.length,1);
  assert.equal(result.objections[0].status,'unresolved');
});

test('different cancellation timeline events are not deterministic contradictions', async () => {
  const {evaluateFindings}=await import('../src/lib/llm');
  const result=await evaluateFindings({},[],{evaluationPrompt:'Review'},undefined,{primaryDocument:'Cancellation requested October 8, 2026. Renewal charged October 10, 2026.',companyResponse:'Reply dated October 15, 2026: cancellation request is acknowledged.'});
  assert.deepEqual(result.conflicts,[]);
});

test('evaluation receives original excerpts and keeps later evidence separately labeled', async () => {
  process.env.NEBIUS_API_KEY='test';
  let prompt='';
  global.fetch=async (_url,init)=>{prompt=String(init?.body);return Response.json({choices:[{message:{content:JSON.stringify({findings:[],unverified:[],unanswered:[],conflicts:[]})}}]});};
  const {evaluateFindings}=await import('../src/lib/llm');
  await evaluateFindings({},[{id:'s1',url:'https://example.com',title:'Policy',snippet:'Policy',retrievedAt:'2026-10-28'}],{evaluationPrompt:'Review'},undefined,{primaryDocument:'ORIGINAL REQUEST OCTOBER EIGHT',factEvidence:{cancellationAttempts:{documentId:'primary',label:'Original record',excerpts:['ORIGINAL REQUEST OCTOBER EIGHT']}},additionalDocuments:[{id:'later',label:'Confirmation',text:'TERMINATION OCTOBER TWELVE'}]});
  assert.match(prompt,/ORIGINAL REQUEST OCTOBER EIGHT/);
  assert.match(prompt,/TERMINATION OCTOBER TWELVE/);
  assert.match(prompt,/factEvidence/);
});

test('draft never quotes a search snippet as a policy passage', async () => {
  const {draftLetter}=await import('../src/lib/llm');
  const source={id:'s1',url:'https://example.com/policy',title:'Policy',snippet:'A full refund is guaranteed for every subscriber.',retrievedAt:'2026-10-29',retrieval:'search_snippet' as const};
  const finding={id:'f1',statement:'Refund guaranteed',stance:'favors-customer' as const,sourceIds:['s1'],supportingPassage:source.snippet,verified:true};
  const result=await draftLetter({},[finding],{}, {letterTemplate:'',escalationLadder:{}},'Alex','a review','English','14 days',[source]);
  assert.doesNotMatch(result.letter,/A full refund is guaranteed/);
  assert.deepEqual(result.citations,[]);
});

test('workspace extracts uploaded record facts while retaining each document identity', async () => {
  process.env.NEBIUS_API_KEY='test';
  global.fetch=async()=>Response.json({choices:[{message:{content:JSON.stringify({company:'Example',currency:'USD',disputedAmount:40,companyPosition:[]})}}]});
  const {extractWorkspaceRecords}=await import('../src/lib/workspace-extract');
  const result=await extractWorkspaceRecords([{id:'receipt',label:'Receipt.txt',text:'Example charged USD 40.'}],getPack('subscription-cancel')!);
  assert.equal(result.facts.company,'Example');
  assert.equal(result.evidence.company.documentId,'receipt');
  assert.equal(result.evidence.company.label,'Receipt.txt');
});

test('document audit separates the company reply from attributed record facts when web research is unavailable', async () => {
  const {buildDocumentAudit}=await import('../src/lib/document-audit');
  const audit=buildDocumentAudit({facts:{company:'Example'},factEvidence:{company:{documentId:'receipt',label:'Receipt',excerpts:['Example']}},companyResponse:'We cannot refund the fee.'});
  assert.deepEqual(audit.records,[{label:'Company',value:'Example',documentId:'receipt',documentLabel:'Receipt',excerpt:'Example'}]);
  assert.equal(audit.companyReply,'We cannot refund the fee.');
});

test('different charge and refund amounts are not automatically conflicting', async () => {
  const {evaluateFindings}=await import('../src/lib/llm');
  const result=await evaluateFindings({amount:288,currency:'USD'},[],{evaluationPrompt:'Review'},undefined,{companyResponse:'We offered a partial refund of USD 89.',factEvidence:{amount:{documentId:'primary',label:'Receipt',excerpts:['USD 288']}}});
  assert.deepEqual(result.conflicts,[]);
});

test('workspace research triggers only for a stated policy or procedure question', async () => {
  const {workspaceResearchNeeded}=await import('../src/lib/query');
  assert.equal(workspaceResearchNeeded('The company charged me twice.','We corrected the duplicate charge.'),false);
  assert.equal(workspaceResearchNeeded('I requested a refund.','Our terms say no refund.'),true);
  assert.equal(workspaceResearchNeeded('Where can I file a complaint?',''),true);
});

test('workspace emits attributed document audit before research and skips irrelevant web searches', async () => {
  process.env.NEBIUS_API_KEY='test';
  let searches=0;
  global.fetch=async input=>{
    if (String(input).includes('tavily')) { searches++; return Response.json({results:[]}); }
    return Response.json({choices:[{message:{content:JSON.stringify({company:'Example',amount:40,companyPosition:[]})}}]});
  };
  const events:import('../src/lib/types').AnalysisProgressEvent[]=[];
  const result=await runPipeline({documentText:'Example charged 40 twice.',pack:getPack('surprise-bill')!,country:'US',workspaceMode:true,onProgress:event=>events.push(event)});
  const early=events.find(event=>event.type==='document-audit');
  assert.ok(early && early.type==='document-audit' && early.audit.records.some(record=>record.value==='Example'));
  assert.equal(searches,0);
  assert.equal(result.sources.length,0);
});

test('workspace record extraction contributes attributed facts alongside a typed account', async () => {
  process.env.NEBIUS_API_KEY='test';
  const {parseCaseRequest}=await import('../src/lib/request');
  const payload=parseCaseRequest({documentText:'I was charged twice.',packId:'surprise-bill',country:'US',intent:'first-complaint',workspaceDocuments:[{id:'receipt',label:'Bill.txt',role:'record',text:'Example billed USD 40.'}]});
  global.fetch=async (_input,init)=>{
    const body=String(init?.body);
    const data=body.includes('Example billed') ? {company:'Example',amount:40,currency:'USD',companyPosition:[]} : {company:null,amount:null,currency:null,companyPosition:[]};
    return Response.json({choices:[{message:{content:JSON.stringify(data)}}]});
  };
  const result=await runPipeline({...payload,pack:getPack(payload.packId)!});
  assert.equal(result.facts.company,'Example');
  assert.equal(result.factEvidence.company.documentId,'receipt');
  assert.equal(result.documentAudit?.records.find(record=>record.documentId==='receipt')?.documentLabel,'Bill.txt');
});

test('draft excludes earlier company replies from customer-provided supporting evidence', async () => {
  const {draftLetter}=await import('../src/lib/llm');
  const result=await draftLetter({},[],{}, {letterTemplate:'',escalationLadder:{}},'Alex','a review','English','14 days',[],undefined,[{label:'Earlier company reply',text:'Our earlier denial is correct.',role:'previous-company-reply'},{label:'Receipt',text:'Amount: USD 40.'}]);
  assert.doesNotMatch(result.letter,/Our earlier denial is correct/);
  assert.match(result.letter,/Amount: USD 40/);
});

test('a document-only review warns when company reply has not been compared', async () => {
  process.env.NEBIUS_API_KEY='test';
  global.fetch=async()=>Response.json({choices:[{message:{content:JSON.stringify({company:'Example',amount:40,companyPosition:[]})}}]});
  const result=await runPipeline({documentText:'Example charged 40 twice.',companyResponse:'We have corrected that.',pack:getPack('surprise-bill')!,country:'US',workspaceMode:true});
  assert.ok(result.warnings.some(warning=>/company.*not.*compared/i.test(warning)));
});

test('unrelated company policy cannot be presented as the disputed company policy', async () => {
  process.env.NEBIUS_API_KEY='test';
  const {investigateObjections}=await import('../src/lib/rebuttal');
  global.fetch=async()=>Response.json({choices:[{message:{tool_calls:[{id:'finish',type:'function',function:{name:'finish_investigation',arguments:JSON.stringify({objections:[{hypothesis:'Example Streaming requires a 30 day notice.',supportingPassage:'Cancel at least 30 days in advance.',sourceIds:['s1'],evidenceNeeded:[]}]})}}]}}]});
  const result=await investigateObjections({facts:{company:'Example Streaming'},companyResponse:'We decline.',country:'US',additionalDocuments:[],sources:[{id:'s1',title:'Other gym',url:'https://other-gym.example/terms',snippet:'Cancel at least 30 days in advance.',retrievedAt:'2026-10-29'}]});
  assert.equal(result.objections[0].status,'unsupported');
  assert.doesNotMatch(result.objections[0].hypothesis,/Example Streaming requires/);
  assert.deepEqual(result.objections[0].sourceIds,[]);
});
