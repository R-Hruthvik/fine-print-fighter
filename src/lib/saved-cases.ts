import type { Country, PipelineResult } from "./types";
import { getPack } from "./packs";

export type SavedCaseSummary = {
  id: string;
  company_name: string;
  pack_id: string;
  jurisdiction: Country;
  created_at: string;
  updated_at: string;
};

export type SavedCaseDetail = SavedCaseSummary & {
  documents: { label: string; text: string }[];
  analysis: PipelineResult;
  letter: string;
};

export type SaveCaseInput = {
  companyName: string;
  packId: string;
  jurisdiction: Country;
  documents: { label: string; text: string }[];
  analysis: PipelineResult;
  letter: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
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
  if (!isRecord(analysis.factEvidence) || !Object.values(analysis.factEvidence).every((evidence) => isRecord(evidence)
    && typeof evidence.documentId === "string" && typeof evidence.label === "string" && isStringArray(evidence.excerpts))) return false;
  if (!isStringArray(analysis.queries)) return false;
  if (analysis.country !== "IN" && analysis.country !== "EU" && analysis.country !== "US") return false;
  if (typeof analysis.letter !== "string" || analysis.letter.length > 30_000) return false;
  if (!Array.isArray(analysis.sources) || !analysis.sources.every((source) => isRecord(source)
    && typeof source.id === "string" && typeof source.url === "string" && typeof source.title === "string"
    && typeof source.snippet === "string" && typeof source.retrievedAt === "string")) return false;
  if (!Array.isArray(analysis.findings) || !analysis.findings.every((finding) => isRecord(finding)
    && typeof finding.id === "string" && typeof finding.statement === "string"
    && ["favors-customer", "favors-company", "unclear"].includes(String(finding.stance))
    && isStringArray(finding.sourceIds) && typeof finding.supportingPassage === "string" && typeof finding.verified === "boolean")) return false;
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
    && typeof citation.id === "number" && typeof citation.title === "string" && typeof citation.url === "string")) return false;
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
  if (!Array.isArray(input.documents) || input.documents.length < 1 || input.documents.length > 20) return false;
  if (!input.documents.every((doc) => doc && typeof doc.label === "string" && doc.label.trim().length > 0 && doc.label.length <= 200
    && typeof doc.text === "string" && doc.text.trim().length > 0)) return false;
  if (!input.documents.some((doc) => doc.label === "Primary document") || !input.documents.some((doc) => doc.label === "Company response")) return false;
  const documentCharacters = input.documents.reduce((total, doc) => total + doc.text.length, 0);
  if (documentCharacters > 30_000 || typeof input.letter !== "string" || input.letter.length > 30_000) return false;
  if (!isValidCaseAnalysis(input.analysis, input.letter) || input.analysis.country !== input.jurisdiction) return false;
  return true;
}
