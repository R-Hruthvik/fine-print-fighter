import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { runPipeline } from "../src/lib/pipeline";
import { getPack, registerPacks } from "../src/lib/packs";
import { extractFacts } from "../src/lib/llm";
import { describeRemedy } from "../src/lib/pipeline";

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
    { findings: [], unverified: ["Fee eligibility unknown"], unanswered: ["What sector?"], conflicts: [] },
    { letter: "Please review the disputed fee. [Customer name]", citations: [] },
  ];
  global.fetch = async (input) => {
    if (String(input).includes("tavily")) return Response.json({ results: [{ url: "https://example.com/policy", title: "Policy", content: "Please contact the company about disputed charges." }] });
    const output = outputs.shift();
    if (!output) throw new Error("Unexpected model call");
    return Response.json({ choices: [{ message: { content: JSON.stringify(output) } }] });
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
      assert.equal(result.score.rating, "medium");
      assert.equal(result.letterCitations[0].url, "https://example.com/policy");
      assert.match(result.letter, /\[1\]/);
      assert.match(result.letter, /confirm whether this information applies/);
      assert.equal(result.conflicts.length, 1);
      assert.equal(result.country, country);
    }
  }
});
