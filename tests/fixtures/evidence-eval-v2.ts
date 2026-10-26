import { createHash } from "node:crypto";
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

type CandidateInput = Omit<CandidateEvidenceEval, "datasetVersion" | "status" | "review">;
const makeCandidate = (input: CandidateInput): CandidateEvidenceEval => ({
  ...input,
  datasetVersion: "2.0.0",
  status: "candidate_pending_expert_review",
  review: { status: "pending_expert_review", reviewerLabels: [], adjudicatedLabels: [], notes: "Candidate labels must be independently reviewed and adjudicated before use as evaluation ground truth." },
});

const retainedPassage = (id: string, excerpt: string, locator: string) => ({
  id,
  excerpt,
  excerptStart: 0 as const,
  excerptEnd: excerpt.length,
  locator,
  excerptSha256: createHash("sha256").update(excerpt, "utf8").digest("hex"),
});

/** All scenarios are fictional; quoted excerpts are short and source-grounded. */
export const CANDIDATE_EVAL_CASES: CandidateEvidenceEval[] = [
  makeCandidate({
    id: "flight-in-delay-facilities",
    packId: "flight-delay", jurisdiction: "IN",
    scenario: {
      summary: "Synthetic Indian flight record omits check-in and exact delay facts.", synthetic: true,
      facts: [{ key: "operatingCarrier", value: "Sample Air", provenance: "synthetic_scenario" }, { key: "eventDate", value: "2026-02-10", provenance: "synthetic_scenario" }],
      missingFacts: [{ key: "checkedInOnTime", reasonRequired: "The cited paragraph conditions facilities on timely check-in." }, { key: "blockTimeAndDelay", reasonRequired: "The applicable delay threshold depends on block time." }],
    },
    source: {
      url: "https://www.dgca.gov.in/digigov-portal/Upload?attachId=we1PSlOuQhYdHcwKKrm7ew%3D%3D&flag=iframeAttachView",
      title: "Civil Aviation Requirements, Section 3, Series M, Part IV, revision 4", publisher: "Directorate General of Civil Aviation", authority: "regulator", sourceKind: "regulation", reviewedOn: "2026-10-26", accessStatus: "opened_directly",
      passages: [retainedPassage("p1", "if the passenger has checked in on time", "§3.4.1, PDF page 5; revision effective 2023-02-15")],
      caveat: "The full rule also has block-time thresholds and exceptions. This excerpt alone cannot establish a specific passenger's remedy.",
    },
    claims: [
      { id: "f-in-1", statement: "The cited delay-facility paragraph makes on-time check-in a condition.", speaker: "source", kind: "published_rule", passageIds: ["p1"], proposedRelation: "supports", proposedRelationRationale: "The excerpt states the check-in condition; context must be retained for the full rule.", proposedApplicability: "not_established", proposedApplicabilityRationale: "The synthetic record omits check-in, block time, and actual delay." },
      { id: "f-in-2", statement: "Any two-hour delay guarantees cash compensation.", speaker: "system", kind: "inference", passageIds: ["p1"], proposedRelation: "insufficient", proposedRelationRationale: "This excerpt concerns a check-in condition for facilities, not a universal cash-compensation rule.", proposedApplicability: "not_established", proposedApplicabilityRationale: "The applicable threshold and event facts are absent." },
    ],
  }),
  makeCandidate({
    id: "flight-eu-arrival-threshold",
    packId: "flight-delay", jurisdiction: "EU",
    scenario: {
      summary: "Synthetic itinerary records a two-hour final-destination arrival delay; route eligibility facts are omitted.", synthetic: true,
      facts: [{ key: "arrivalDelay", value: "2 hours", provenance: "synthetic_scenario" }],
      missingFacts: [{ key: "routeAndOperatingCarrier", reasonRequired: "The page's EU scope depends on route and carrier." }, { key: "eventDate", reasonRequired: "The applicable rule version must be checked for the event date." }],
    },
    source: {
      url: "https://europa.eu/youreurope/citizens/travel/passenger-rights/air/",
      title: "Air passenger rights", publisher: "European Union — Your Europe", authority: "official_explainer", sourceKind: "guidance", reviewedOn: "2026-10-26", accessStatus: "opened_directly",
      passages: [retainedPassage("p1", "If you arrived at your final destination with a delay of 3 hours or more", "Delay at arrival section, page lines 523 and 638–647")],
      caveat: "The page also states an extraordinary-circumstances exception and route/carrier conditions. This is an explainer, not a case decision.",
    },
    claims: [
      { id: "f-eu-1", statement: "The explainer describes three hours of arrival delay at the final destination as a threshold.", speaker: "source", kind: "official_guidance", passageIds: ["p1"], proposedRelation: "supports", proposedRelationRationale: "The passage directly states the three-hour final-destination delay condition.", proposedApplicability: "not_established", proposedApplicabilityRationale: "Route, operating carrier, date, and exception facts are not supplied." },
      { id: "f-eu-2", statement: "A two-hour final-destination arrival delay meets the quoted threshold.", speaker: "system", kind: "inference", passageIds: ["p1"], proposedRelation: "opposes", proposedRelationRationale: "The passage says three hours or more, which conflicts with a two-hour threshold claim.", proposedApplicability: "not_established", proposedApplicabilityRationale: "Even a relation label does not establish the rule applies to this itinerary." },
    ],
  }),
  makeCandidate({
    id: "flight-us-rebooking-refund",
    packId: "flight-delay", jurisdiction: "US",
    scenario: {
      summary: "Synthetic US flight record says a replacement flight was accepted; date and booking facts are omitted.", synthetic: true,
      facts: [{ key: "acceptedRebooking", value: "yes", provenance: "synthetic_scenario" }],
      missingFacts: [{ key: "eventDate", reasonRequired: "Rule status and effective date must match the trip date." }, { key: "ticketAndItinerary", reasonRequired: "The refund guidance depends on the booked trip and what was accepted." }],
    },
    source: {
      url: "https://www.transportation.gov/briefing-room/what-airline-passengers-need-know-about-dots-automatic-refund-rule",
      title: "What Airline Passengers Need to Know About DOT’s Automatic Refund Rule", publisher: "U.S. Department of Transportation", authority: "regulator", sourceKind: "guidance", reviewedOn: "2026-10-26", accessStatus: "opened_directly",
      passages: [retainedPassage("p1", "You are not entitled to a refund if you accept a rebooked flight", "When Passengers Are Entitled to a Refund, page line 37")],
      caveat: "Distinguish ticket refunds from delay compensation. The page's date and rule status must be checked against the synthetic event date.",
    },
    claims: [
      { id: "f-us-1", statement: "The DOT page says accepting a rebooked flight falls outside the described refund rule.", speaker: "source", kind: "official_guidance", passageIds: ["p1"], proposedRelation: "supports", proposedRelationRationale: "The excerpt directly states this condition.", proposedApplicability: "uncertain", proposedApplicabilityRationale: "The trip date and complete itinerary are missing; current status must be verified." },
      { id: "f-us-2", statement: "A passenger who accepted a rebooked flight still qualifies for a refund under this rule.", speaker: "system", kind: "inference", passageIds: ["p1"], proposedRelation: "opposes", proposedRelationRationale: "The excerpt says the opposite of the narrow acceptance claim.", proposedApplicability: "uncertain", proposedApplicabilityRationale: "A relation label alone is not a case-specific outcome." },
    ],
  }),
  makeCandidate({
    id: "subscription-in-card-mandate",
    packId: "subscription-cancel", jurisdiction: "IN",
    scenario: {
      summary: "Synthetic recurring card payment record does not identify the card issuer or mandate status.", synthetic: true,
      facts: [{ key: "billingMethod", value: "card", provenance: "synthetic_scenario" }],
      missingFacts: [{ key: "issuerAndMandateType", reasonRequired: "The RBI circular describes card e-mandates and issuer duties." }, { key: "eventDate", reasonRequired: "The circular and later framework must be checked for the relevant date." }],
    },
    source: {
      url: "https://m.rbi.org.in/scripts/RTGS_Notification.aspx?Id=11668",
      title: "Processing of e-mandate on cards for recurring transactions", publisher: "Reserve Bank of India", authority: "regulator", sourceKind: "regulation", reviewedOn: "2026-10-26", accessStatus: "opened_directly",
      passages: [retainedPassage("p1", "The issuer shall provide the cardholder an online facility to withdraw any e-mandate at any point of time", "Annex, Withdrawal of e-mandate, page line 45")],
      caveat: "This is about card e-mandate withdrawal by an issuer. It does not establish cancellation of the underlying service contract or refund rights; later circulars may affect current handling.",
    },
    claims: [
      { id: "s-in-1", statement: "The RBI circular describes an online withdrawal facility for card e-mandates.", speaker: "source", kind: "published_rule", passageIds: ["p1"], proposedRelation: "supports", proposedRelationRationale: "The excerpt directly states the online withdrawal facility.", proposedApplicability: "uncertain", proposedApplicabilityRationale: "Issuer, mandate type, and event date are missing." },
      { id: "s-in-2", statement: "Withdrawing a card e-mandate automatically cancels the subscription contract and guarantees a refund.", speaker: "system", kind: "inference", passageIds: ["p1"], proposedRelation: "insufficient", proposedRelationRationale: "The passage addresses mandate withdrawal, not the service contract or refunds.", proposedApplicability: "not_established", proposedApplicabilityRationale: "The service terms and billing relationship are absent." },
    ],
  }),
  makeCandidate({
    id: "subscription-eu-contract-scope",
    packId: "subscription-cancel", jurisdiction: "EU",
    scenario: {
      summary: "Synthetic online subscription scenario omits service type, Member State, and dates.", synthetic: true,
      facts: [{ key: "signupChannel", value: "online", provenance: "synthetic_scenario" }],
      missingFacts: [{ key: "serviceTypeAndMemberState", reasonRequired: "Contract type, exceptions, and national implementation can matter." }, { key: "signupAndCancellationDates", reasonRequired: "Withdrawal periods and later cancellation rules depend on timing." }],
    },
    source: {
      url: "https://commission.europa.eu/law/law-topic/consumer-protection-law/consumer-contract-law/consumer-rights-directive_en",
      title: "Consumer rights directive", publisher: "European Commission", authority: "official_explainer", sourceKind: "guidance", reviewedOn: "2026-10-26", accessStatus: "opened_directly",
      passages: [retainedPassage("p1", "The directive applies to all contracts concluded between a \"consumer\" and a \"trader\"", "About the directive, page line 41")],
      caveat: "The page also describes regulatory choices, amendments, contract categories, and specific withdrawal rights. This sentence alone does not establish a universal right to cancel an ongoing subscription for a refund.",
    },
    claims: [
      { id: "s-eu-1", statement: "The Commission page says the Directive applies to contracts between consumers and traders.", speaker: "source", kind: "official_guidance", passageIds: ["p1"], proposedRelation: "supports", proposedRelationRationale: "The excerpt says the directive applies to consumer-trader contracts.", proposedApplicability: "uncertain", proposedApplicabilityRationale: "The actual trader, contract type, Member State, dates, and exceptions are not established." },
      { id: "s-eu-2", statement: "Every ongoing subscription can always be cancelled for a full refund under this Directive.", speaker: "system", kind: "inference", passageIds: ["p1"], proposedRelation: "insufficient", proposedRelationRationale: "This scope excerpt does not discuss ongoing cancellation or full refunds.", proposedApplicability: "not_established", proposedApplicabilityRationale: "Service type, withdrawal/cancellation distinction, dates, and exceptions are unknown." },
    ],
  }),
  makeCandidate({
    id: "subscription-us-rule-status",
    packId: "subscription-cancel", jurisdiction: "US",
    scenario: {
      summary: "Synthetic auto-renewal complaint does not identify state, enrollment method, or event date.", synthetic: true,
      facts: [{ key: "billingPattern", value: "recurring", provenance: "synthetic_scenario" }],
      missingFacts: [{ key: "stateAndSector", reasonRequired: "State and sector rules may differ." }, { key: "enrollmentMethodAndEventDate", reasonRequired: "The rule page describes evolving rulemaking and status must be verified for the event." }],
    },
    source: {
      url: "https://www.ftc.gov/legal-library/browse/rules/negative-option-rule",
      title: "The Need for Amendments to the Rule Concerning the Use of Prenotification Negative Option Plans", publisher: "Federal Trade Commission", authority: "regulator", sourceKind: "guidance", reviewedOn: "2026-10-26", accessStatus: "opened_directly",
      passages: [retainedPassage("p1", "The Need for Amendments to the Rule Concerning the Use of Prenotification Negative Option Plans", "Page title and March 11, 2026 request for comment, page lines 7–24")],
      caveat: "The page includes current rulemaking materials. It is not enough to infer a current universal cancellation rule or its applicability to a particular subscription.",
    },
    claims: [
      { id: "s-us-1", statement: "The FTC page concerns whether amendments to the Negative Option Rule are needed.", speaker: "source", kind: "official_guidance", passageIds: ["p1"], proposedRelation: "supports", proposedRelationRationale: "The page title directly describes that question and the page lists a request for comment.", proposedApplicability: "uncertain", proposedApplicabilityRationale: "The rule's current status and the synthetic event date need current legal review." },
      { id: "s-us-2", statement: "This page establishes one currently effective cancellation rule for every subscription in the United States.", speaker: "system", kind: "inference", passageIds: ["p1"], proposedRelation: "insufficient", proposedRelationRationale: "A page title about possible amendments does not establish universal present requirements.", proposedApplicability: "not_established", proposedApplicabilityRationale: "State, sector, enrollment, and date facts are missing." },
    ],
  }),
  makeCandidate({
    id: "bill-in-itemized-statement",
    packId: "surprise-bill", jurisdiction: "IN",
    scenario: {
      summary: "Synthetic patient bill dispute omits state, facility type, and adoption status.", synthetic: true,
      facts: [{ key: "sector", value: "healthcare", provenance: "synthetic_scenario" }, { key: "billDate", value: "2026-03-01", provenance: "synthetic_scenario" }],
      missingFacts: [{ key: "stateAndFacilityType", reasonRequired: "The charter is recommended for adoption and state rules vary." }, { key: "adoptionStatus", reasonRequired: "The source itself notes state adoption and legal provisions differ." }],
    },
    source: {
      url: "https://clinicalestablishments.mohfw.gov.in/sites/default/files/2023-07/8431.pdf",
      title: "Charter of Patients’ Rights for adoption by NHRC", publisher: "National Human Rights Commission / Ministry of Health and Family Welfare", authority: "official_explainer", sourceKind: "guidance", reviewedOn: "2026-10-26", accessStatus: "opened_directly",
      passages: [retainedPassage("p1", "the patient has the right to receive an itemized bill", "Right to information, PDF page 3; preamble pages 1–2")],
      caveat: "This is a charter recommended for adoption. The document notes that legal provisions are scattered and state adoption differs; it is not a universal nationwide billing statute by itself.",
    },
    claims: [
      { id: "b-in-1", statement: "The NHRC patient-rights charter describes an itemized-bill right.", speaker: "source", kind: "official_guidance", passageIds: ["p1"], proposedRelation: "supports", proposedRelationRationale: "The excerpt directly describes that right in the charter.", proposedApplicability: "uncertain", proposedApplicabilityRationale: "State adoption, facility type, and applicable binding provisions are not established." },
      { id: "b-in-2", statement: "The charter alone proves every hospital nationwide is bound by one fixed price schedule.", speaker: "system", kind: "inference", passageIds: ["p1"], proposedRelation: "insufficient", proposedRelationRationale: "The excerpt is about an itemized bill, not a universal price schedule or binding status.", proposedApplicability: "not_established", proposedApplicabilityRationale: "The source's adoption caveat and local facts are unresolved." },
    ],
  }),
  makeCandidate({
    id: "bill-eu-cross-border-care",
    packId: "surprise-bill", jurisdiction: "EU",
    scenario: {
      summary: "Synthetic medical invoice concerns care received outside the patient's home country; insurance and care facts are missing.", synthetic: true,
      facts: [{ key: "sector", value: "healthcare", provenance: "synthetic_scenario" }, { key: "crossBorder", value: "yes", provenance: "synthetic_scenario" }],
      missingFacts: [{ key: "homeAndTreatmentCountry", reasonRequired: "The source concerns cross-border care and national systems." }, { key: "careTypeAndCoverage", reasonRequired: "Reimbursement conditions depend on the treatment and coverage." }],
    },
    source: {
      url: "https://health.ec.europa.eu/cross-border-healthcare/overview_en",
      title: "Overview: cross-border healthcare", publisher: "European Commission, Directorate-General for Health and Food Safety", authority: "official_explainer", sourceKind: "guidance", reviewedOn: "2026-10-26", accessStatus: "opened_directly",
      passages: [retainedPassage("p1", "sets out the conditions under which a patient may travel to another EU country to receive medical care and reimbursement", "Overview, page lines 39–41")],
      caveat: "This is cross-border healthcare guidance. It does not establish a universal rule for domestic bills or full reimbursement of every overseas charge.",
    },
    claims: [
      { id: "b-eu-1", statement: "The Commission page says the Directive sets conditions for cross-border care and reimbursement.", speaker: "source", kind: "official_guidance", passageIds: ["p1"], proposedRelation: "supports", proposedRelationRationale: "The passage directly describes conditions for care and reimbursement in another EU country.", proposedApplicability: "uncertain", proposedApplicabilityRationale: "Countries, treatment type, coverage, and reimbursement conditions are missing." },
      { id: "b-eu-2", statement: "Every medical charge from care abroad is reimbursed in full.", speaker: "system", kind: "inference", passageIds: ["p1"], proposedRelation: "qualifies", proposedRelationRationale: "The passage expressly says conditions apply, which qualifies a universal full-reimbursement claim.", proposedApplicability: "not_established", proposedApplicabilityRationale: "The source says conditions apply, but the synthetic scenario omits them." },
    ],
  }),
  makeCandidate({
    id: "bill-us-emergency-coverage-scope",
    packId: "surprise-bill", jurisdiction: "US",
    scenario: {
      summary: "Synthetic US invoice describes an out-of-network emergency service but omits coverage program and plan details.", synthetic: true,
      facts: [{ key: "sector", value: "healthcare", provenance: "synthetic_scenario" }, { key: "serviceType", value: "emergency", provenance: "synthetic_scenario" }, { key: "networkStatus", value: "out_of_network", provenance: "synthetic_scenario" }],
      missingFacts: [{ key: "coverageProgramAndPlan", reasonRequired: "CMS lists covered private-plan contexts and program exclusions." }, { key: "serviceDateAndProviderFacts", reasonRequired: "Service and event facts must be checked against the protections and exceptions." }],
    },
    source: {
      url: "https://www.cms.gov/nosurprises/consumer-protections/What-are-the-new-protections",
      title: "What are the new protections?", publisher: "Centers for Medicare & Medicaid Services", authority: "regulator", sourceKind: "guidance", reviewedOn: "2026-10-26", accessStatus: "opened_directly",
      passages: [retainedPassage("p1", "Emergency services, even if they’re provided out-of-network, must be covered at an in-network rate", "What are the new protections?, page lines 687–694")],
      caveat: "CMS describes specified plan contexts and exclusions. The No Surprises Act is not a universal rule for all medical bills or coverage programs.",
    },
    claims: [
      { id: "b-us-1", statement: "CMS says covered emergency services may receive in-network-rate coverage even when out-of-network.", speaker: "source", kind: "official_guidance", passageIds: ["p1"], proposedRelation: "supports", proposedRelationRationale: "The excerpt directly states the emergency and out-of-network rate relationship.", proposedApplicability: "uncertain", proposedApplicabilityRationale: "Coverage program, plan, date, and service details are not supplied." },
      { id: "b-us-2", statement: "These protections cover every US medical bill regardless of coverage program.", speaker: "system", kind: "inference", passageIds: ["p1"], proposedRelation: "insufficient", proposedRelationRationale: "The excerpt addresses emergency services but does not establish coverage of every bill or program.", proposedApplicability: "not_established", proposedApplicabilityRationale: "The synthetic scenario omits the coverage program and relevant plan facts." },
    ],
  }),
];
