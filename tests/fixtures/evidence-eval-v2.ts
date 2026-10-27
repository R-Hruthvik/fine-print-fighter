import candidateData from "./evidence-eval-v2.json";
import type { CaseType, Country } from "../../src/lib/types";

export type RelationLabel = "supports" | "opposes" | "qualifies" | "mentions" | "insufficient";
export type ApplicabilityLabel = "supported" | "not_established" | "uncertain";

export type CandidateEvidenceEval = {
  id: string;
  datasetVersion: "2.0.0";
  status: "candidate_pending_expert_review";
  packId: CaseType;
  jurisdiction: Country;
  scenario: {
    summary: string;
    synthetic: true;
    facts: { key: string; value: string | null; provenance: "synthetic_scenario" }[];
    missingFacts: { key: string; reasonRequired: string }[];
  };
  source: {
    url: string;
    title: string;
    publisher: string;
    authority: "regulator" | "official_company" | "official_explainer";
    sourceKind: "legislation" | "regulation" | "guidance" | "company_policy";
    reviewedOn: string;
    accessStatus: "opened_directly" | "not_accessible";
    passages: { id: string; excerpt: string; excerptStart: 0; excerptEnd: number; locator: string; excerptSha256: string }[];
    caveat: string;
  };
  claims: {
    id: string;
    statement: string;
    speaker: "consumer" | "company" | "source" | "system";
    kind: "consumer_fact" | "company_assertion" | "published_rule" | "official_guidance" | "policy_term" | "inference";
    passageIds: string[];
    proposedRelation: RelationLabel;
    proposedRelationRationale: string;
    proposedApplicability: ApplicabilityLabel;
    proposedApplicabilityRationale: string;
  }[];
  review: {
    status: "pending_expert_review";
    reviewerLabels: { reviewerAlias: string; claimId: string; relation: RelationLabel; applicability: ApplicabilityLabel; rationale: string }[];
    adjudicatedLabels: { claimId: string; relation: RelationLabel; applicability: ApplicabilityLabel; rationale: string }[];
    notes: string;
  };
};

export const CANDIDATE_EVAL_CASES = candidateData as unknown as CandidateEvidenceEval[];
