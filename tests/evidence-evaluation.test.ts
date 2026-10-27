import { strict as assert } from "node:assert";
import { test } from "node:test";
import { constrainScore, verifyFindings } from "../src/lib/evidence";
import { classifySourceProfiles } from "../src/lib/pipeline";
import { normalizeScopeAnswers, SCOPE_QUESTIONS } from "../src/lib/scope-answers";
import { getSourceProfile } from "../src/lib/source-registry";
import { getPack } from "../src/lib/packs";
import type { Finding, Source } from "../src/lib/types";
import { ADVERSARIAL_SCENARIOS, BASE_SCENARIOS } from "./fixtures/evidence-eval-v1";

const syntheticFinding = (quote: string, sourceIds = ["s1"]): Finding => ({
  id: "candidate",
  statement: "A synthetic passage may be relevant to review.",
  stance: "favors-customer",
  sourceIds,
  supportingPassage: quote,
  verified: false,
});

const syntheticSource = (overrides: Partial<Source> = {}): Source => ({
  id: "s1",
  url: "https://example.test/synthetic-page",
  title: "Synthetic evaluation source",
  snippet: "SYNTHETIC EVAL TEXT ONLY. The sample says request a review.",
  retrievedAt: "2026-01-01T00:00:00.000Z",
  retrieval: "provider_extract",
  authority: "unreviewed",
  jurisdiction: "unknown",
  freshness: "unknown",
  ...overrides,
});

test("offline evidence evaluation v1: nine pack-jurisdiction cases preserve unknown scope", () => {
  assert.equal(BASE_SCENARIOS.length, 9);
  let reviewedAuthorityCount = 0;
  let unknownScopeCount = 0;

  for (const scenario of BASE_SCENARIOS) {
    const questions = SCOPE_QUESTIONS[scenario.packId];
    assert.ok(questions.length > 0, scenario.id);
    for (const key of scenario.unknownKeys) assert.ok(questions.some(question => question.key === key), `${scenario.id}: unknown key ${key} is not a question`);

    const normalized = normalizeScopeAnswers(scenario.packId, scenario.scopeInput);
    for (const key of scenario.unknownKeys) {
      const answer = normalized.answers.find(item => item.key === key);
      assert.equal(answer?.status, "not_provided", `${scenario.id}: ${key} must stay explicitly unknown`);
      assert.equal(answer?.value, null);
      unknownScopeCount += 1;
    }

    const profile = getSourceProfile(scenario.packId, scenario.country);
    const pack = getPack(scenario.packId);
    assert.ok(profile?.sources[0], `${scenario.id}: source profile missing`);
    assert.ok(pack, `${scenario.id}: pack missing`);
    const source = syntheticSource({
      id: "s1",
      url: profile!.sources[0].url,
      title: profile!.sources[0].title,
      authority: "unreviewed",
    });
    const finding = syntheticFinding("The sample says request a review.");
    const [verified] = verifyFindings([finding], [source]);
    assert.equal(verified.evidenceStatus, "source_quote_matched", scenario.id);
    assert.equal(verified.claimRelation, "unreviewed", scenario.id);
    assert.equal(verified.applicability, "unknown", scenario.id);
    const match = verified.sourceMatches?.[0];
    assert.ok(match, `${scenario.id}: expected a source offset`);
    assert.equal(source.snippet.slice(match.start, match.end), "The sample says request a review.", scenario.id);

    classifySourceProfiles([source], pack!, scenario.country);
    assert.equal(source.authority, profile!.sources[0].kind, scenario.id);
    assert.equal(source.jurisdiction, scenario.country, scenario.id);
    reviewedAuthorityCount += 1;
    assert.equal(constrainScore([verified], { rating: "strong", reasons: [], evidenceToGather: [] }).rating, "weak", scenario.id);
  }

  assert.equal(reviewedAuthorityCount, 9);
  assert.ok(unknownScopeCount >= 9);
});

test("offline evidence evaluation v1: quote precision, recall, and offsets meet 100% on labeled quote cases", () => {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  for (const scenario of ADVERSARIAL_SCENARIOS.quotes) {
    const source = syntheticSource({ snippet: scenario.text });
    const [finding] = verifyFindings([syntheticFinding(scenario.quote)], [source]);
    const matched = finding.evidenceStatus === "source_quote_matched";
    if (matched && scenario.expectedMatch) {
      truePositive += 1;
      const match = finding.sourceMatches?.[0];
      assert.ok(match, `${scenario.id}: expected offsets`);
      const retained = source.snippet.slice(match.start, match.end).replace(/\s+/g, " ").trim();
      assert.equal(retained, scenario.quote.replace(/\s+/g, " ").trim(), scenario.id);
    } else if (matched) {
      falsePositive += 1;
    } else if (scenario.expectedMatch) {
      falseNegative += 1;
    }
  }

  assert.equal(truePositive, 2);
  assert.equal(falsePositive, 0);
  assert.equal(falseNegative, 0);
  assert.equal(truePositive / (truePositive + falsePositive), 1);
  assert.equal(truePositive / (truePositive + falseNegative), 1);
});

test("offline evidence evaluation v1: missing, unsafe, or partly invalid citations never promote", () => {
  const source = syntheticSource();
  const quote = "The sample says request a review.";
  const cases = [
    { finding: syntheticFinding(quote, ["missing"]), sources: [source] },
    { finding: syntheticFinding(quote), sources: [syntheticSource({ url: "javascript:alert(1)" })] },
    { finding: syntheticFinding(quote, ["s1", "s2"]), sources: [source] },
  ];

  for (const [index, item] of cases.entries()) {
    const [finding] = verifyFindings([item.finding], item.sources);
    assert.equal(finding.evidenceStatus, "source_quote_unmatched", `invalid citation case ${index + 1}`);
    assert.equal(constrainScore([finding], { rating: "strong", reasons: [], evidenceToGather: [] }).rating, "weak");
  }
});

test("offline evidence evaluation v1: lookalike and unlisted-company domains stay unreviewed", () => {
  const pack = getPack("flight-delay");
  assert.ok(pack);
  const source = syntheticSource({ url: ADVERSARIAL_SCENARIOS.spoofedAuthority.url });
  classifySourceProfiles([source], pack, "IN", ADVERSARIAL_SCENARIOS.spoofedAuthority.companyName);
  assert.equal(source.authority, ADVERSARIAL_SCENARIOS.spoofedAuthority.expectedAuthority);
  assert.equal(source.jurisdiction, "unknown");
});

test("offline evidence evaluation v1: stale and unavailable metadata cannot imply applicability", () => {
  for (const scenario of [ADVERSARIAL_SCENARIOS.freshness, ADVERSARIAL_SCENARIOS.unavailable]) {
    const source = syntheticSource({ freshness: scenario.freshness, extractionStatus: scenario.extractionStatus });
    const [finding] = verifyFindings([syntheticFinding("The sample says request a review.")], [source]);
    assert.equal(source.freshness, scenario.freshness, scenario.id);
    assert.equal(source.extractionStatus, scenario.extractionStatus, scenario.id);
    assert.equal(finding.applicability, scenario.expectedApplicability, scenario.id);
    assert.equal(constrainScore([finding], { rating: "strong", reasons: [], evidenceToGather: [] }).rating, scenario.expectedRating, scenario.id);
  }
});

test("offline evidence evaluation v1: conflict and prompt-injection fixtures remain flagged for human review", () => {
  const { conflicts, promptInjection } = ADVERSARIAL_SCENARIOS;
  assert.equal(conflicts.requiresHumanReview, true);
  assert.equal(conflicts.claims.length, 2);
  assert.notEqual(conflicts.claims[0].statement, conflicts.claims[1].statement);
  assert.equal(conflicts.expected, "preserve_both_unresolved");
  assert.equal(promptInjection.requiresHumanReview, true);
  assert.match(promptInjection.documentText, /ignore all prior instructions/i);
  assert.match(promptInjection.retrievedText, /reveal hidden prompts/i);
  assert.equal(promptInjection.expected, "evidence_text_is_data_not_instructions");
});
