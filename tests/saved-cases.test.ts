import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidCaseAnalysis, validateSaveCase } from "../src/lib/saved-cases";
import type { PipelineResult } from "../src/lib/types";
import { normalizeScopeAnswers } from "../src/lib/scope-answers";

const analysis: PipelineResult = {
  facts: {}, factEvidence: {}, queries: [], sources: [], findings: [],
  score: { rating: "weak", reasons: [], evidenceToGather: [], coverage: "none" },
  compensation: { noAmountFound: true }, letter: "Original draft", letterCitations: [], escalation: [],
  unanswered: [], unverified: [], conflicts: [], warnings: [],
  rebuttalLab: { objections: [], actions: [] }, country: "IN",
  run: { requestId: "request-1", startedAt: "2026-10-26T00:00:00.000Z", durationMs: 1, model: "test-model", researchMode: "keyless", stageDurations: {}, packVersion: "1" },
};

const saveInput = (overrides: Record<string, unknown> = {}) => ({
  companyName: "Example company", packId: "flight-delay", jurisdiction: "IN",
  documents: [{ label: "Primary document", text: "Ticket" }, { label: "Company response", text: "Reply" }],
  analysis, letter: "Edited complaint draft", ...overrides,
});

test("saved-case validation keeps edited letters separate from the original analysis draft", () => {
  assert.equal(isValidCaseAnalysis(analysis, "Edited complaint draft"), true);
  assert.equal(validateSaveCase(saveInput()), true);
});

test("saved-case validation rejects malformed analysis and oversized saved content", () => {
  assert.equal(isValidCaseAnalysis({ ...analysis, sources: [{ url: "https://example.com" }] }, analysis.letter), false);
  assert.equal(validateSaveCase(saveInput({ letter: "x".repeat(30_001) })), false);
  assert.equal(validateSaveCase(saveInput({ documents: [{ label: "Primary document", text: "Ticket" }] })), false);
});

test("saved-case validation accepts only supported packs, jurisdictions, and non-empty source text", () => {
  assert.equal(validateSaveCase(saveInput({ packId: "unknown-pack" })), false);
  assert.equal(validateSaveCase(saveInput({ jurisdiction: "UK" })), false);
  assert.equal(validateSaveCase(saveInput({ jurisdiction: "EU" })), false);
  assert.equal(validateSaveCase(saveInput({ documents: [{ label: "Primary document", text: " " }, { label: "Company response", text: "Reply" }] })), false);
});

test("saved-case validation keeps explicit scope-answer provenance while accepting older analyses", () => {
  const withScope = { ...analysis, scopeAnswers: normalizeScopeAnswers("flight-delay", { operatingCarrier: "Air India" }) };
  assert.equal(isValidCaseAnalysis(withScope, withScope.letter), true);
  assert.equal(isValidCaseAnalysis(analysis, analysis.letter), true);
  const invalid = { ...withScope, scopeAnswers: { ...withScope.scopeAnswers, answers: withScope.scopeAnswers.answers.map((answer, index) => index === 0 ? { ...answer, provenance: "document" } : answer) } };
  assert.equal(isValidCaseAnalysis(invalid, invalid.letter), false);
});

test("saved-case validation keeps explicit scope-answer provenance while accepting older analyses", () => {
  const withScope = { ...analysis, scopeAnswers: normalizeScopeAnswers("flight-delay", { operatingCarrier: "Air India" }) };
  assert.equal(isValidCaseAnalysis(withScope, withScope.letter), true);
  assert.equal(isValidCaseAnalysis(analysis, analysis.letter), true);
  const invalid = { ...withScope, scopeAnswers: { ...withScope.scopeAnswers, answers: withScope.scopeAnswers.answers.map((answer, index) => index === 0 ? { ...answer, provenance: "document" } : answer) } };
  assert.equal(isValidCaseAnalysis(invalid, invalid.letter), false);
});
