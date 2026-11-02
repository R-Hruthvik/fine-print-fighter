import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidCaseAnalysis, resolveSavedCompanyName, restoreSavedCaseDocuments, savedCompanyNameSuggestion, validateSaveCase } from "../src/lib/saved-cases";
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
  documents: [
    { id: "primary-document", role: "primary-record", label: "Primary document", text: "Ticket" },
    { id: "company-response", role: "company-reply", label: "Company response", text: "Reply" },
  ],
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

test("saved-case validation accepts a primary document without a company reply and restores an empty response", () => {
  const documents = [{ id: "primary-document", role: "primary-record", label: "Primary document", text: "Ticket" }];
  assert.equal(validateSaveCase(saveInput({ documents })), true);
  assert.deepEqual(restoreSavedCaseDocuments(documents), {
    primaryDocument: documents[0], companyReply: undefined, additionalDocuments: [],
  });
  assert.equal(restoreSavedCaseDocuments(documents)?.companyReply?.text ?? "", "");
  assert.equal(validateSaveCase(saveInput({ documents: [{ ...documents[0], text: " " }] })), false);
  assert.equal(validateSaveCase(saveInput({ documents: [...documents, { id: "empty-exhibit", role: "unknown", label: "Notes", text: " " }] })), false);
});

test("saved company names prefer user text, then usable extracted facts, then a safe fallback", () => {
  assert.equal(resolveSavedCompanyName("  My Airline  ", "Extracted Airline"), "My Airline");
  assert.equal(resolveSavedCompanyName(" ", "  Example Streaming  "), "Example Streaming");
  assert.equal(resolveSavedCompanyName("N/A", " Air India "), "Air India");
  for (const unusable of ["", "unknown", "not stated", "not supplied", "not found", "unspecified", "n/a", "none", "null", "  UNKNOWN  ", 42, null, undefined, "x".repeat(201)]) {
    assert.equal(resolveSavedCompanyName("not supplied", unusable), "Unlisted company");
  }
  assert.equal(resolveSavedCompanyName("User Company", "x".repeat(201)), "User Company");
});

test("flight company suggestions fall back from unusable company facts to usable airline facts", () => {
  assert.equal(savedCompanyNameSuggestion({ company: " Example Support ", airline: "Air India" }, "flight-delay"), "Example Support");
  for (const company of ["", "unknown", "N/A", "x".repeat(201)]) {
    assert.equal(savedCompanyNameSuggestion({ company, airline: " Air India " }, "flight-delay"), "Air India");
  }
  assert.equal(savedCompanyNameSuggestion({ company: "N/A", airline: "Air India" }, "subscription-cancel"), undefined);
  assert.equal(savedCompanyNameSuggestion({ company: "unknown", airline: "x".repeat(201) }, "flight-delay"), undefined);
  assert.equal(savedCompanyNameSuggestion({ airline: "Air India" }, "flight-delay"), "Air India");
  assert.equal(savedCompanyNameSuggestion({ airline: "Air India" }, "surprise-bill"), undefined);
});


test("saved document metadata preserves stable IDs and explicit roles through restore", () => {
  const documents = [
    { id: "primary-document", role: "primary-record", label: "Original bill", text: "Primary text" },
    { id: "company-response", role: "company-reply", label: "Company email", text: "Reply text" },
    { id: "receipt-2026", role: "customer-record", label: "Receipt", text: "USD 40" },
    { id: "context-2026", role: "unknown", label: "Notes", text: "Context only" },
  ];
  assert.equal(validateSaveCase(saveInput({ documents })), true);
  assert.deepEqual(restoreSavedCaseDocuments(documents), {
    primaryDocument: documents[0],
    companyReply: documents[1],
    additionalDocuments: documents.slice(2),
  });
});

test("legacy reserved labels restore their roles while arbitrary extras remain unknown", () => {
  const restored = restoreSavedCaseDocuments([
    { label: "Primary document", text: "Primary text" },
    { label: "Company response", text: "Reply text" },
    { label: "Customer receipt", text: "USD 40" },
  ]);
  assert.equal(restored?.primaryDocument.id, "primary-document");
  assert.equal(restored?.companyReply?.id, "company-response");
  assert.deepEqual(restored?.additionalDocuments, [{ id: "saved-unknown-1", role: "unknown", label: "Customer receipt", text: "USD 40" }]);
});

test("legacy saved cases retain the prior twenty-document read limit while new saves require typed metadata", () => {
  const legacyDocuments = [
    { label: "Primary document", text: "Primary" },
    { label: "Company response", text: "Reply" },
    ...Array.from({ length: 18 }, (_, index) => ({ label: `Old exhibit ${index + 1}`, text: `Context ${index + 1}` })),
  ];
  assert.equal(restoreSavedCaseDocuments(legacyDocuments)?.additionalDocuments.length, 18);
  assert.equal(validateSaveCase(saveInput({ documents: legacyDocuments })), false);
});

test("saved document metadata rejects duplicate, reserved collisions, ambiguous roles, and oversized text", () => {
  const validDocuments = saveInput().documents as { label: string; text: string }[];
  assert.equal(validateSaveCase(saveInput({ documents: [
    { id: "same", role: "primary-record", label: "Primary", text: "Ticket" },
    { id: "company-response", role: "company-reply", label: "Reply", text: "Reply" },
    { id: "same", role: "unknown", label: "Extra", text: "Extra" },
  ] })), false);
  assert.equal(restoreSavedCaseDocuments([
    { id: "primary-document", role: "unknown", label: "Context", text: "Context" },
    ...validDocuments,
  ]), null);
  assert.equal(restoreSavedCaseDocuments([
    { id: "primary-a", role: "primary-record", label: "A", text: "A" },
    { id: "primary-b", role: "primary-record", label: "B", text: "B" },
  ]), null);
  assert.equal(validateSaveCase(saveInput({ documents: [
    { id: "primary-document", role: "primary-record", label: "Primary", text: "x".repeat(30001) },
    { id: "company-response", role: "company-reply", label: "Reply", text: "Reply" },
  ] })), false);
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
