import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCaseRequest, readJSON, errorResponse, allowStageRoute, takeBudget } from "../src/lib/request";

const valid = { documentText: "A charge appeared after cancellation.", companyResponse: "The company declined the request.", packId: "subscription-cancel", country: "IN" };

test("case requests reject whitespace, unknown packs/countries, non-string options and excess input", () => {
  for (const mutation of [
    { documentText: "   " }, { packId: "toString" }, { country: "UK" },
    { userName: {} }, { desiredOutcome: 12 }, { documentText: "x".repeat(30001) },
    { userName: "x".repeat(201) }, { language: "x".repeat(81) },
  ]) assert.throws(() => parseCaseRequest({ ...valid, ...mutation }));
  assert.throws(() => parseCaseRequest(null));
});

test("valid case requests normalize empty options and keep the original document", () => {
  const parsed = parseCaseRequest({ ...valid, documentText: "  Bill text\n", userName: "  ", language: "" });
  assert.equal(parsed.documentText, "  Bill text\n");
  assert.equal(parsed.userName, undefined);
  assert.equal(parsed.language, "English");
  assert.equal(parsed.replyDeadline, "14 days");
  assert.equal(parsed.scopeAnswers?.answers.length, 4);
  assert.ok(parsed.scopeAnswers?.answers.every((answer) => answer.status === "not_provided" && answer.provenance === "user_answer"));
});

test("scope answers are bounded, pack-specific, and preserve optional unknowns", () => {
  const parsed = parseCaseRequest({ ...valid, scopeAnswers: { signupDate: "2026-03-01", billingPartner: "App store" } });
  assert.equal(parsed.scopeAnswers?.answers.find((answer) => answer.key === "signupDate")?.value, "2026-03-01");
  assert.equal(parsed.scopeAnswers?.answers.find((answer) => answer.key === "signupDate")?.provenance, "user_answer");
  assert.equal(parsed.scopeAnswers?.answers.find((answer) => answer.key === "cancellationDate")?.value, null);
  assert.throws(() => parseCaseRequest({ ...valid, scopeAnswers: { operatingCarrier: "Air India" } }), /selected complaint type/i);
  assert.throws(() => parseCaseRequest({ ...valid, scopeAnswers: { signupDate: "2026-02-31" } }), /valid date/i);
  assert.throws(() => parseCaseRequest({ ...valid, scopeAnswers: { signupDate: "x".repeat(201) } }), /exceeds/i);
});

test("JSON reader rejects malformed and oversized actual streams regardless of content length", async () => {
  await assert.rejects(readJSON(new Request("http://localhost", { method: "POST", body: "{" })), /valid JSON/i);
  const request = new Request("http://localhost", { method: "POST", body: "x".repeat(262145), headers: { "content-length": "1" } });
  await assert.rejects(readJSON(request), /large/i);
});

test("errors suppress raw exception messages and preserve safe provider status", async () => {
  const secret = errorResponse(new Error("secret upstream key and account"), "r1");
  assert.equal(secret.status, 500);
  assert.doesNotMatch(await secret.text(), /secret|account/);
  const provider = errorResponse(Object.assign(new Error("secret upstream body"), { code: "PROVIDER_OUTPUT", status: 502, retryable: true }), "r2");
  assert.equal(provider.status, 502);
  assert.equal((await provider.json()).requestId, "r2");
});

test("stage routes are unavailable unless explicitly enabled in development", () => {
  assert.equal(allowStageRoute("production", "true"), false);
  assert.equal(allowStageRoute("development", undefined), false);
  assert.equal(allowStageRoute("development", "true"), true);
});

test("budget permits three analyses per window and expires entries", () => {
  const entries = new Map<string, { count: number; expires: number }>();
  assert.equal(takeBudget(entries, "client", 1000), true);
  assert.equal(takeBudget(entries, "client", 1001), true);
  assert.equal(takeBudget(entries, "client", 1002), true);
  assert.equal(takeBudget(entries, "client", 1003), false);
  assert.equal(takeBudget(entries, "client", 61001), true);
});

test('first complaints can omit a company reply without weakening reply-review validation', () => {
  const base={documentText:'I was charged USD 15.99 after requesting cancellation.',packId:'subscription-cancel',country:'US'};
  assert.equal(parseCaseRequest({...base,intent:'first-complaint'}).companyResponse,'');
  assert.throws(()=>parseCaseRequest(base));
});

test('workspace accepts separate labeled documents and permits a record without a typed note', () => {
  const parsed = parseCaseRequest({documentText:'',packId:'subscription-cancel',country:'US',intent:'first-complaint',workspaceDocuments:[
    {id:'rec1',label:'Receipt.txt',role:'record',text:'Charged $40.'},
    {id:'rep1',label:'Reply.txt',role:'company-reply',text:'We decline.'},
    {id:'rec2',label:'Email.txt',role:'record',text:'I requested cancellation.'},
  ]});
  assert.equal(parsed.documentText,'Charged $40.');
  assert.equal(parsed.companyResponse,'We decline.');
  assert.deepEqual(parsed.additionalDocuments,[{id:'rec2',label:'Email.txt',text:'I requested cancellation.'}]);
});

test('workspace rejects duplicate document identities, unsupported roles, absent jurisdiction and oversized documents', () => {
  const base={documentText:'A note',packId:'subscription-cancel',country:'US',intent:'first-complaint'};
  const doc={id:'one',label:'Record',role:'record',text:'A record'};
  for(const mutation of [
    {workspaceDocuments:[doc,doc]}, {workspaceDocuments:[{...doc,role:'other'}]},
    {workspaceDocuments:[{...doc,text:'x'.repeat(12001)}]}, {country:''},
    {workspaceDocuments:[{...doc,role:'company-reply'}, {...doc,id:'two',role:'company-reply'}]},
  ]) assert.throws(()=>parseCaseRequest({...base,...mutation}));
});

test('workspace retains identity of record chosen as primary when the note is empty', () => {
  const result=parseCaseRequest({documentText:'',packId:'subscription-cancel',country:'US',intent:'first-complaint',workspaceDocuments:[{id:'receipt',label:'Receipt.txt',role:'record',text:'Charged $40.'}]});
  assert.deepEqual(result.workspacePrimary,{id:'receipt',label:'Receipt.txt'});
});

test('previous company replies retain their role when workspace evidence is parsed', () => {
  const result=parseCaseRequest({documentText:'I was charged twice.',packId:'surprise-bill',country:'US',intent:'first-complaint',workspaceDocuments:[{id:'old',label:'Earlier reply',role:'previous-company-reply',text:'We refuse.'},{id:'new',label:'New reply',role:'company-reply',text:'We still refuse.'}]});
  assert.deepEqual(result.additionalDocuments,[{id:'old',label:'Earlier reply',text:'We refuse.',role:'previous-company-reply'}]);
});
