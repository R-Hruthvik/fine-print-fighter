import type { Country, PipelineResult, SavedDocumentRole } from "./types";
import { getPack } from "./packs";
import { isValidScopeAnswers } from "./scope-answers";
import { safeSourceURL } from "./evidence";

export type SavedCaseSummary = {
  id: string;
  company_name: string;
  pack_id: string;
  jurisdiction: Country;
  created_at: string;
  updated_at: string;
};

export type SavedCaseDocument = { id: string; label: string; text: string; role: SavedDocumentRole };

export type RestoredCaseDocuments = {
  primaryDocument: SavedCaseDocument;
  companyReply?: SavedCaseDocument;
  additionalDocuments: SavedCaseDocument[];
};

export type SavedCaseDetail = SavedCaseSummary & {
  documents: (SavedCaseDocument | { label: string; text: string })[];
  analysis: PipelineResult;
  letter: string;
};

export type SaveCaseInput = {
  companyName: string;
  packId: string;
  jurisdiction: Country;
  documents: SavedCaseDocument[];
  analysis: PipelineResult;
  letter: string;
};

const SAVED_COMPANY_NAME_SENTINELS = new Set([
  "unknown", "not stated", "not supplied", "not found", "unspecified", "n/a", "none", "null",
]);

function usableSavedCompanyName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 200 || SAVED_COMPANY_NAME_SENTINELS.has(trimmed.toLocaleLowerCase())) return undefined;
  return trimmed;
}

/** Choose a user-confirmed name first, then a bounded document suggestion. */
export function resolveSavedCompanyName(userEntered: unknown, extracted: unknown): string {
  return usableSavedCompanyName(userEntered) ?? usableSavedCompanyName(extracted) ?? "Unlisted company";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

const DOCUMENT_ROLES: SavedDocumentRole[] = ["primary-record", "customer-record", "company-reply", "previous-company-reply", "unknown"];

function roleForSavedDocument(document: Record<string, unknown>): SavedDocumentRole | undefined {
  if (document.role === undefined) {
    if (document.label === "Primary document") return "primary-record";
    if (document.label === "Company response") return "company-reply";
    return "unknown";
  }
  return typeof document.role === "string" && DOCUMENT_ROLES.includes(document.role as SavedDocumentRole)
    ? document.role as SavedDocumentRole : undefined;
}

/** Read current metadata and legacy {label,text} rows without guessing exhibit roles. */
export function restoreSavedCaseDocuments(value: unknown): RestoredCaseDocuments | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) return null;
  const hasMetadata = value.some(item => isRecord(item) && (item.id !== undefined || item.role !== undefined));
  const hasCompleteMetadata = value.every(item => isRecord(item) && item.id !== undefined && item.role !== undefined);
  if (hasMetadata && !hasCompleteMetadata) return null;
  const typedDocuments = hasMetadata;
  if (typedDocuments && value.length > 5) return null;
  const seen = new Set<string>();
  const normalized: SavedCaseDocument[] = [];
  let legacyIndex = 0;
  for (const item of value) {
    if (!isRecord(item) || typeof item.label !== "string" || !item.label.trim() || item.label.length > 200
      || typeof item.text !== "string" || !item.text.trim() || item.text.length > 30_000) return null;
    const role = roleForSavedDocument(item);
    if (!role) return null;
    if (item.id !== undefined && (typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(item.id))) return null;
    const id = typeof item.id === "string" ? item.id : role === "primary-record" ? "primary-document"
      : role === "company-reply" ? "company-response" : `saved-unknown-${++legacyIndex}`;
    if (seen.has(id)) return null;
    seen.add(id);
    if (id === "primary-document" && role !== "primary-record" || id === "company-response" && role !== "company-reply") return null;
    if (item.role !== undefined && (item.label === "Primary document" && role !== "primary-record"
      || item.label === "Company response" && role !== "company-reply")) return null;
    normalized.push({ id, role, label: item.label.trim(), text: item.text });
  }
  const primaryDocuments = normalized.filter(document => document.role === "primary-record");
  const companyReplies = normalized.filter(document => document.role === "company-reply");
  if (primaryDocuments.length !== 1 || companyReplies.length > 1) return null;
  const primaryDocument = primaryDocuments[0];
  const companyReply = companyReplies[0];
  const additionalDocuments = normalized.filter(document => document !== primaryDocument && document !== companyReply);
  if (typedDocuments && additionalDocuments.length > 3) return null;
  if (additionalDocuments.filter(document => document.role === "customer-record").length > 3) return null;
  if (typedDocuments && additionalDocuments.some(document => document.text.length > 12_000)) return null;
  if (normalized.reduce((total, document) => total + document.text.length, 0) > 30_000) return null;
  return { primaryDocument, companyReply, additionalDocuments };
}

/** Validate the analysis shape returned by the pipeline and the storage limits used by saves. */
export function isValidCaseAnalysis(analysis: unknown, letter: unknown): analysis is PipelineResult {
  if (!isRecord(analysis) || typeof letter !== "string" || letter.length > 30_000) return false;
  let serializedLength: number;
  try { serializedLength = JSON.stringify(analysis).length; }
  catch { return false; }
  if (serializedLength > 180_000) return false;

  const score = analysis.score;
  const compensation = analysis.compensation;
  const run = analysis.run;
  const rebuttalLab = analysis.rebuttalLab;
  if (!isRecord(analysis.facts) || !Object.values(analysis.facts).every((fact) => fact === null || typeof fact === "string"
    || (typeof fact === "number" && Number.isFinite(fact)) || isStringArray(fact))) return false;
  if (analysis.scopeAnswers !== undefined) {
    if (!isRecord(analysis.scopeAnswers) || typeof analysis.scopeAnswers.packId !== "string" || !getPack(analysis.scopeAnswers.packId)
      || !isValidScopeAnswers(analysis.scopeAnswers, analysis.scopeAnswers.packId as Parameters<typeof isValidScopeAnswers>[1])) return false;
  }
  if (!isRecord(analysis.factEvidence) || !Object.values(analysis.factEvidence).every((evidence) => isRecord(evidence)
    && typeof evidence.documentId === "string" && typeof evidence.label === "string" && isStringArray(evidence.excerpts))) return false;
  if (!isStringArray(analysis.queries)) return false;
  if (analysis.country !== "IN" && analysis.country !== "EU" && analysis.country !== "US") return false;
  if (typeof analysis.letter !== "string" || analysis.letter.length > 30_000) return false;
  if (!Array.isArray(analysis.sources) || !analysis.sources.every((source) => isRecord(source)
    && typeof source.id === "string" && typeof source.url === "string" && safeSourceURL(source.url) && typeof source.title === "string"
    && typeof source.snippet === "string" && typeof source.retrievedAt === "string"
    && (source.retrieval === undefined || ["search_snippet", "provider_extract", "reviewed_catalog"].includes(String(source.retrieval)))
    && (source.authority === undefined || ["regulator", "official_company", "official_explainer", "secondary", "unreviewed"].includes(String(source.authority)))
    && (source.jurisdiction === undefined || ["IN", "EU", "US", "unknown"].includes(String(source.jurisdiction)))
    && (source.freshness === undefined || ["unknown", "current_checked", "changed", "stale", "unavailable"].includes(String(source.freshness)))
    && (source.contentHash === undefined || typeof source.contentHash === "string" && /^[a-f0-9]{64}$/i.test(source.contentHash))
    && isOptionalString(source.publisher) && isOptionalString(source.extractedAt)
    && isOptionalString(source.requestedUrl) && (source.requestedUrl === undefined || typeof source.requestedUrl === "string" && safeSourceURL(source.requestedUrl))
    && isOptionalString(source.finalUrl) && (source.finalUrl === undefined || typeof source.finalUrl === "string" && safeSourceURL(source.finalUrl))
    && (source.extractionStatus === undefined || ["extracted", "failed", "skipped_no_key", "not_selected"].includes(String(source.extractionStatus)))
    && (source.extractionFailure === undefined || ["rate_limited", "timed_out", "unavailable", "invalid_response"].includes(String(source.extractionFailure)))
    && (source.queries === undefined || isStringArray(source.queries)))) return false;
  const sourceById = new Map((analysis.sources as Record<string, unknown>[]).map((source) => [String(source.id), source]));
  if (!Array.isArray(analysis.findings) || !analysis.findings.every((finding) => isRecord(finding)
    && typeof finding.id === "string" && typeof finding.statement === "string"
    && ["favors-customer", "favors-company", "unclear"].includes(String(finding.stance))
    && isStringArray(finding.sourceIds) && typeof finding.supportingPassage === "string" && typeof finding.verified === "boolean"
    && (finding.evidenceStatus === undefined || ["source_quote_matched", "source_quote_unmatched"].includes(String(finding.evidenceStatus)))
    && (finding.claimRelation === undefined || finding.claimRelation === "unreviewed")
    && (finding.verificationReason === undefined || typeof finding.verificationReason === "string")
    && (finding.sourceMatches === undefined || Array.isArray(finding.sourceMatches) && finding.sourceMatches.every((match) => isRecord(match)
      && typeof match.sourceId === "string" && sourceById.has(match.sourceId)
      && Number.isInteger(match.start) && Number(match.start) >= 0
      && Number.isInteger(match.end) && Number(match.end) > Number(match.start)
      && match.offsetBasis === "retained_source_text"
      && Number(match.end) <= String(sourceById.get(match.sourceId)?.snippet ?? "").length)))) return false;
  if (!isRecord(score) || !["strong", "medium", "weak"].includes(String(score.rating))
    || !["sufficient", "limited", "none"].includes(String(score.coverage))
    || !isStringArray(score.reasons) || !isStringArray(score.evidenceToGather)) return false;
  if (!isRecord(compensation)
    || (compensation.currency !== undefined && typeof compensation.currency !== "string")
    || (compensation.amount !== undefined && (typeof compensation.amount !== "number" || !Number.isFinite(compensation.amount)))
    || (compensation.formula !== undefined && typeof compensation.formula !== "string")
    || (compensation.sourceId !== undefined && typeof compensation.sourceId !== "string")
    || (compensation.working !== undefined && typeof compensation.working !== "string")
    || (compensation.noAmountFound !== undefined && typeof compensation.noAmountFound !== "boolean")
    || (compensation.disputedAmount !== undefined && (typeof compensation.disputedAmount !== "number" || !Number.isFinite(compensation.disputedAmount)))) return false;
  if (!Array.isArray(analysis.letterCitations) || !analysis.letterCitations.every((citation) => isRecord(citation)
    && typeof citation.id === "number" && typeof citation.title === "string" && typeof citation.url === "string" && safeSourceURL(citation.url))) return false;
  if (!Array.isArray(analysis.escalation) || !analysis.escalation.every((step) => isRecord(step)
    && typeof step.step === "number" && typeof step.body === "string" && typeof step.action === "string")) return false;
  if (!isStringArray(analysis.unanswered) || !isStringArray(analysis.unverified)
    || !isStringArray(analysis.conflicts) || !isStringArray(analysis.warnings)) return false;
  if (!isRecord(rebuttalLab)
    || !Array.isArray(rebuttalLab.objections) || !rebuttalLab.objections.every((objection) => isRecord(objection)
      && typeof objection.id === "string" && typeof objection.hypothesis === "string" && typeof objection.supportingPassage === "string"
      && isStringArray(objection.evidenceNeeded) && ["unresolved", "document-provided", "unsupported"].includes(String(objection.status))
      && isStringArray(objection.sourceIds))
    || !Array.isArray(rebuttalLab.actions) || !rebuttalLab.actions.every((action) => isRecord(action)
      && typeof action.tool === "string" && typeof action.summary === "string" && isStringArray(action.sourceIds)
      && typeof action.durationMs === "number" && Number.isFinite(action.durationMs))) return false;
  if (!isRecord(run) || typeof run.requestId !== "string" || typeof run.startedAt !== "string"
    || typeof run.durationMs !== "number" || !Number.isFinite(run.durationMs) || typeof run.model !== "string"
    || (run.researchMode !== "keyed" && run.researchMode !== "keyless")
    || !isRecord(run.stageDurations) || !Object.values(run.stageDurations).every((duration) => typeof duration === "number" && Number.isFinite(duration))
    || typeof run.packVersion !== "string") return false;
  return true;
}

export function validateSaveCase(value: unknown): value is SaveCaseInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<SaveCaseInput>;
  if (typeof input.companyName !== "string" || input.companyName.trim().length < 1 || input.companyName.length > 200) return false;
  if (typeof input.packId !== "string" || !getPack(input.packId)) return false;
  if (!("IN EU US".split(" ").includes(input.jurisdiction ?? ""))) return false;
  if (!Array.isArray(input.documents) || input.documents.length < 1 || input.documents.length > 5
    || !input.documents.every(doc => isRecord(doc) && typeof doc.id === "string" && typeof doc.role === "string")) return false;
  const restoredDocuments = restoreSavedCaseDocuments(input.documents);
  if (!restoredDocuments) return false;
  const documentCharacters = input.documents.reduce((total, doc) => total + doc.text.length, 0);
  if (documentCharacters > 30_000 || typeof input.letter !== "string" || input.letter.length > 30_000) return false;
  if (!isValidCaseAnalysis(input.analysis, input.letter) || input.analysis.country !== input.jurisdiction) return false;
  if (input.analysis.scopeAnswers && input.analysis.scopeAnswers.packId !== input.packId) return false;
  return true;
}
