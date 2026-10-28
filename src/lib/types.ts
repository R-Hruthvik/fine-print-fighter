export type Country = "IN" | "EU" | "US";

export type CaseType = "flight-delay" | "subscription-cancel" | "surprise-bill";

export type AnalysisStage = "extract" | "plan" | "research" | "rebuttal" | "evaluate" | "score" | "draft" | "escalate";
export type AnalysisProgressEvent =
  | { type: "stage"; stage: AnalysisStage; phase: "started" | "completed" | "failed"; durationMs?: number }
  | { type: "tool"; tool: string; summary: string; sourceIds: string[]; durationMs: number };

export interface ExtractedFacts {
  [key: string]: string | string[] | number | null | undefined;
  disputeSummary?: string;
  companyPosition?: string[];
}

export interface ExtractedFactResult {
  facts: ExtractedFacts;
  evidence: Record<string, { documentId: string; label: string; excerpts: string[] }>;
}

export interface ScopeAnswer {
  key: string;
  label: string;
  value: string | null;
  status: "provided" | "not_provided";
  provenance: "user_answer";
}

export interface ScopeAnswers {
  packId: CaseType;
  answers: ScopeAnswer[];
}

export interface Source {
  id: string;
  url: string;
  title: string;
  snippet: string;
  retrievedAt: string;
  /** Search results are discovery leads; they are not retained page snapshots. */
  retrieval?: "search_snippet" | "provider_extract" | "reviewed_catalog";
  authority?: "regulator" | "official_company" | "official_explainer" | "secondary" | "unreviewed";
  jurisdiction?: Country | "unknown";
  freshness?: "unknown" | "current_checked" | "changed" | "stale" | "unavailable";
  contentHash?: string;
  publisher?: string;
  requestedUrl?: string;
  finalUrl?: string;
  extractedAt?: string;
  extractionStatus?: "extracted" | "failed" | "skipped_no_key" | "not_selected";
  extractionFailure?: "rate_limited" | "timed_out" | "unavailable" | "invalid_response";
  kind?: "rules" | "company policy" | "similar cases";
  queries?: string[];
}

export interface Finding {
  id: string;
  statement: string;
  stance: "favors-customer" | "favors-company" | "unclear";
  sourceIds: string[];
  supportingPassage: string;
  verified: boolean;
  /** A traceability result only; it does not validate the claim's meaning. */
  evidenceStatus?: "source_quote_matched" | "source_quote_unmatched";
  claimRelation?: "unreviewed";
  sourceMatches?: { sourceId: string; start: number; end: number; offsetBasis: "retained_source_text" }[];
  applicability?: "supported" | "unknown";
  verificationReason?: string;
}

export interface CaseScore {
  rating: "strong" | "medium" | "weak";
  reasons: string[];
  evidenceToGather: string[];
  coverage: "sufficient" | "limited" | "none";
}

export interface CompensationResult {
  currency?: string;
  amount?: number;
  formula?: string;
  sourceId?: string;
  working?: string;
  noAmountFound?: boolean;
  disputedAmount?: number;
}

export interface EscalationStep {
  step: number;
  body: string;
  action: string;
  timing?: string;
  sourceId?: string;
  provenance?: "source" | "unreviewed-pack";
  applicability?: "supported" | "unknown";
}

export interface PipelineResult {
  reviewSummary?: import("./review-summary").ReviewSummary;
  facts: ExtractedFacts;
  factEvidence: Record<string, { documentId: string; label: string; excerpts: string[] }>;
  /** User-entered scope details remain separate from document-extracted facts. Optional for older saved runs. */
  scopeAnswers?: ScopeAnswers;
  queries: string[];
  sources: Source[];
  findings: Finding[];
  score: CaseScore;
  compensation: CompensationResult;
  letter: string;
  letterCitations: { id: number; title: string; url: string }[];
  escalation: EscalationStep[];
  unanswered: string[];
  unverified: string[];
  conflicts: string[];
  warnings: string[];
  rebuttalLab: {
    objections: {
      id: string;
      hypothesis: string;
      supportingPassage: string;
      evidenceNeeded: string[];
      evidenceMatch?: { documentId: string; label: string; passage: string };
      status: "unresolved" | "document-provided" | "unsupported";
      sourceIds: string[];
    }[];
    actions: { tool: string; summary: string; sourceIds: string[]; durationMs: number }[];
  };
  country: Country;
  run: {
    requestId: string;
    startedAt: string;
    durationMs: number;
    model: string;
    researchMode: "keyed" | "keyless";
    stageDurations: Record<string, number>;
    packVersion: string;
  };
}

export interface RulePack {
  id: CaseType;
  name: string;
  version: string;
  lastReviewed: string | null;
  requiredFacts: string[];
  extractionSchema: string[];
  searchPlan: {
    queries: string[];
    preferredDomains: string[];
  };
  evaluationPrompt: string;
  compensationLogic?: string;
  letterTemplate: string;
  escalationLadder: Record<Country, string[]>;
}
