# AI Evidence Review and Full-App Completion Plan

## Purpose

Make Fine Print Fighter useful for organizing a consumer complaint while keeping a clear boundary between what a user's documents say, what an official source says, and what may or may not apply to the user's circumstances. The app prepares a reviewable draft; it does not decide legal eligibility, send letters, or file complaints.

This document tracks implementation and remaining release work. Provider status checks and a live pipeline run are deliberately deferred to the integration phase.

## Implementation Status (2026-10-26)

The local implementation now has the first evidence and case-continuity safeguards. This is not a production integration sign-off: Supabase migrations still need application and two-account verification, and no live provider request or provider status check has been made.

- **Implemented locally:** pack-specific scope questions; guest save continuation held in session storage with expiry; explicit save consent after authentication; safe local `next` handling; saving the edited letter; expanded saved-case evidence review; immutable analysis-run history and atomic reanalysis; export of run history; typed source profiles for each complaint pack and India/EU/US; source quote matching against extracted page text; limited authority classification and conservative evidence-coverage gating.
- **Still needed before calling evidence evaluation complete:** qualified reviewers must label and adjudicate the v2 candidate set before it becomes a holdout; retrieval, claim-relation, applicability, and security metrics that need live/provider-backed or human grading; stronger source freshness and claim applicability checks; systematic conflict evaluation; and review of how scope answers change outputs across all packs. The deterministic offline baseline covers quote/citation/authority checks, and v2 now contains nine source-opened synthetic candidates with separate passage-relation and applicability labels, all pending expert review. See [Evidence Evaluation v1](evals/evidence-evaluation-v1.md) and [Evidence Evaluation v2 labeling rubric](evals/evidence-evaluation-v2-labeling.md).
- **Integration deferred:** apply and verify the new Supabase migrations in a non-production project, check provider configuration/status, run synthetic live requests, exercise email verification/reset, verify RLS with two accounts, and perform account-backed save/reanalysis/export/deletion flows. No provider status or live pipeline operation was performed for this implementation pass.

The current evidence pipeline now treats search results as candidate sources, extracts selected pages through the retrieval provider, retains bounded source text and offsets, and distinguishes quote traceability from source authority and applicability. The classifier is deliberately conservative; source-domain recognition does not establish that a rule applies to a user's facts.

## Previous Baseline and Remaining Risks

The app has a multi-stage pipeline: document extraction, query planning, web search, company-side objection research, finding evaluation, scoring, letter drafting, and escalation suggestions. Extracted values are retained only when they can be matched back to the primary document, with matching excerpts in `factEvidence`. The company response and exhibits remain separate inputs.

Remaining evidence limitations include freshness and effective-date tracking, complete applicability checks, and a broad labeled regression set. A quote match establishes traceability to retained retrieved text, but does not establish that the publisher is authoritative, the text is current, a policy version matches the event, a claim is supported, or a legal rule applies.

The following items are addressed locally and still need account-backed integration verification:

1. The edited complaint letter is included in the save payload and the continuation flow preserves the analysis until save, cancellation, or expiry.
2. Guests choosing save receive a safe sign-in/sign-up return path and must confirm the save again after authenticating.
3. Saved-case review includes source records, excerpts, facts/provenance, remedy limits and escalation context; reanalysis retains earlier runs and export includes the run history.

The source model stores bounded retrieved page text, source URL/title, retrieval details, content hash, authority classification, and quote offsets. It still does not establish publication/effective dates or robustly detect changed pages. Reanalysis archives each prior analysis run atomically before promoting the new result.

## Evidence Model and User-Facing States

Keep these statuses separate. Do not overload one `verified` boolean with all of them.

| Status | What it means | What it does not mean |
| --- | --- | --- |
| `document_matched` | An extracted fact or quote exactly matches a span of a user-provided document. | The document is true or the speaker is correct. |
| `source_quote_matched` | A quote exactly matches text retrieved from a named page, with offsets into that retained text. | The source is authoritative or the quote supports the generated claim. |
| `source_authority_reviewed` | The publisher/domain and source type were checked against a curated registry or human-reviewed company entry. | The source is applicable to the user's case. |
| `claim_supported`, `claim_opposed`, `claim_qualified`, `claim_unresolved` | A claim-level evaluation describes how the retained passage relates to the claim. | A model judge is a legal determination. |
| `applicability_supported`, `applicability_uncertain`, `applicability_not_established` | Required jurisdiction, dates, route/market, service, and policy version were checked or are still missing. | Guaranteed eligibility, refund, remedy, or success. |
| `source_stale`, `source_changed`, `source_unavailable`, `freshness_unknown` | The source's current availability/version status. | The old text was invalid when it applied. |

Proposed core records:

```ts
type UserEvidence = {
  id: string;
  role: "primary_document" | "company_response" | "exhibit";
  label: string;
  originalText: string;
  contentHash: string;
  receivedAt: string;
};

type Claim = {
  id: string;
  text: string;
  kind: "consumer_fact" | "company_statement" | "published_rule" | "policy_term" | "inference";
  evidenceDocumentId?: string;
  start?: number;
  end?: number;
  exactExcerpt?: string;
};

type SourceSnapshot = {
  id: string;
  requestedUrl: string;
  finalUrl?: string;
  canonicalUrl?: string;
  title?: string;
  publisher?: string;
  authority: "regulator" | "official_company" | "official_explainer" | "secondary" | "unreviewed";
  jurisdiction?: "IN" | "EU" | "US" | "unknown";
  fetchedAt: string;
  publishedAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  contentType?: string;
  contentHash?: string;
  retrieval: "search_snippet" | "provider_extract" | "reviewed_catalog";
  status: "retrieved" | "changed" | "stale" | "unavailable" | "blocked" | "truncated";
  text: string;
};

type GroundingEdge = {
  claimId: string;
  sourceId: string;
  quote: string;
  start: number;
  end: number;
  relation: "supports" | "opposes" | "qualifies" | "mentions";
  scope: "matches" | "uncertain" | "does_not_match";
};

type Conflict = {
  id: string;
  question: string;
  claimIds: string[];
  evidenceIds: string[];
  state: "unresolved" | "clarified";
};
```

Use the provenance model conceptually: a run activity used user documents and source snapshots, and records the provider/model and pack versions. W3C PROV-O models provenance through entities, activities, and agents; the app can use ordinary relational IDs and typed JSON without adopting RDF. [W3C PROV-O](https://www.w3.org/TR/prov-o/)

## Evidence Acquisition and Validation Flow

1. **Capture user evidence with roles.** Accept the primary document, actual company response, and up to the existing exhibit limit as separate records. Preserve page/paragraph offsets to the submitted text. Clearly state that submitted text is sent to configured analysis providers. Ask people to redact credentials and unrelated personal data.

2. **Extract claims, then match them deterministically.** Ask the model to return atomic facts with document ID, exact excerpt and offsets. Keep the current exact text/value checks, and extend them to preserve speaker, dates, amount/currency, event type and uncertainty. If the value cannot be located in the source text, mark it `unverified` or `not stated`; do not use it as a fact in search or in the letter. Keep inferred summaries visibly labeled as summaries.

3. **Collect applicability facts before researching.** Use pack-specific prompts for the minimum facts that select the relevant rules. For flights, request the operating carrier, origin/destination, flight date, and disruption timeline. For subscriptions, request signup/cancellation dates and billing partner/channel. For bills, request provider type, billing jurisdiction, service date, insurer/EOB status, and which line item is disputed. Do not infer jurisdiction from company name or residence alone. Let users continue with unknowns, but expose the narrower analysis limits.

4. **Discover candidate sources.** Run separate searches for (a) regulator/official legal material and (b) the company's policy/support material. Start with curated domains recorded per pack and jurisdiction, then allow broader search as a clearly labeled fallback. Current `preferredDomains` are empty in the reviewed packs; populate them only after source review. Search snippets are leads, not evidence. Keep company-specific research limited for unlisted companies and never mark a user-typed domain trusted automatically.

5. **Retrieve shortlisted source pages.** Use a selected-URL extraction step for candidates instead of treating search snippets as complete source text. Tavily documents a separate Extract endpoint, which accepts selected URLs and returns extraction results; use it as the first implementation path, with per-URL failures kept in the analysis. [Tavily Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search), [Tavily Extract API](https://docs.tavily.com/documentation/api-reference/endpoint/extract)

   If the app later fetches URLs directly, treat that as a security-sensitive subsystem: HTTPS-only, reject URL credentials and IP literals, resolve and block private/link-local/metadata ranges, revalidate every redirect, cap redirect count, response bytes, content types and time, and log a typed blocked/unavailable result. Retrieved pages are untrusted data. OWASP documents direct and indirect prompt injection in user content, web pages and retrieved documents, including RAG poisoning. [OWASP Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)

6. **Record source identity and freshness.** For each source, store its final/canonical URL, publisher, authority class, jurisdiction, retrieval method/time, content hash, fetch status, title, relevant excerpt offsets, and any publication/effective dates with their provenance. Do not treat a search engine publication date as a legal effective date. Keep retrieval date, publication date and effective date distinct. HTTP validators such as `ETag` and `Last-Modified` can help detect changed representations, but they do not prove legal effect or applicability. [RFC 9110, validators](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.8)

7. **Validate atomic claims in separate passes.**
   - Deterministic quote check: exact passage occurs in the retained source text at the recorded offsets.
   - Authority check: publisher/domain maps to the curated source registry; otherwise it remains unreviewed.
   - Claim relation check: a constrained evaluator labels the passage as support, opposition, qualification, or mere mention. Test for negation, exceptions, conditions, date and scope.
   - Applicability check: compare the claim with the user's event date, route/market, company/product, billing partner, policy period and jurisdiction. If a required input is missing, mark uncertain and ask for it.
   - Conflict check: keep competing exact claims and their speakers/sources side by side. Existing date/amount conflict detection is a start; expand it to cancellation status, route/carrier, policy versions and statement scope. Never silently choose which source is true.

   The result UI should say **“Quote found in source”**, **“Official source reviewed”**, and **“Applicability still needs review”** separately. Never convert exact quote matching into a legal eligibility label. NIST warns that generated text and citations can be confidently false or internally inconsistent, so the system must test grounding and provenance empirically and communicate limits. [NIST Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

8. **Request missing evidence specifically.** Turn unresolved questions into a short checklist tied to an objection, e.g. cancellation confirmation, plan terms effective on signup date, itemized bill, EOB, flight itinerary, or written company response. Explain why each item could resolve the issue. Never say that an upload proves a claim; it is evidence supplied by the user and may need corroboration.

9. **Draft from grounded facts only.** Continue to produce a user-reviewed draft with citations generated from the server-side source registry. Include exact quotes only when matched against retained source text. Preserve uncertainty and ask the company to confirm applicability. A user-entered reply period remains a requested period, never a statutory deadline. Do not send or file anything.

10. **Show a full evidence file.** On the live result and saved-case detail, show the documents and speakers, extracted facts with original excerpts, each source's type and jurisdiction, retrieved/updated dates, exact supporting passage, source link, claim relation, unresolved scope, conflicts, missing evidence checklist and warnings. Saved analysis should be understandable without reading internal JSON.

## Full-App Completion Phases

### Phase 1 — Case continuity and saved review (implemented locally; integration verification remains)

- Save the user's edited letter instead of `result.letter`.
- Design a consent-aware guest save continuation. Do not write case data before the explicit unchecked-by-default opt-in. Preserve the in-memory analysis through signup/signin only for the short continuation window, state clearly what is held temporarily, and clear it after successful save, cancellation, or expiry. Prefer client memory/session-scoped temporary state; do not silently create an anonymous database row.
- Return from signup verification/password recovery to a safe local `next` destination, then offer the pending save action without auto-saving.
- Expand saved-case review to include source list, excerpts, claim/document provenance, conflicts, missing facts, remedy limitations and escalation suggestions. Link each finding to its source evidence.
- Make reanalysis versioned. Preserve previous runs and the user's edited letter; tell the user when the current run is being replaced/promoted.

### Phase 2 — Source registry and evidence schemas (initial implementation complete)

- Add versioned metadata types for `Claim`, `GroundingEdge`, `SourceSnapshot`, `Conflict`, evidence status, and immutable `AnalysisRun`.
- Add curated source profiles for each of the three packs and India/EU/US, distinguishing official regulators, company material and official explainers. Set the directory's reviewed date only after opening the sources, recording applicable category/jurisdiction, limitations and review owner.
- Add pack-specific facts required to establish scope, with explicit unknown states. Keep source authority separate from jurisdiction applicability.
- Maintain backwards-compatible parsing for saved cases that lack the new fields.

### Phase 3 — Source retrieval (selected-page extraction implemented; freshness hardening remains)

- Preserve search as candidate discovery.
- Restrict/boost searches using reviewed regulator/company domains; separate query intent and retain the query for provenance.
- Extract the top small set of candidates via the retrieval provider; retain direct page text only as needed, plus a content hash and limited contextual excerpts. Preserve each URL's retrieval failure.
- Normalize page text while retaining offsets into the normalized snapshot and original retrieval record.
- Implement deterministic exact-quote-and-offset verification and separate authority/freshness/scope evaluations.
- Never label secondary or similar-case material as an authoritative rule.

### Phase 4 — Evidence evaluation and abstention (initial conservative gating implemented; evaluation remains)

- Make claims atomic and typed (consumer fact, company assertion, rule, policy, inference).
- Evaluate retrieved passage relevance, support/oppose/qualify relation, possible negation/exception, source scope, and event-date applicability separately.
- Keep unresolved and contradictory claims; ask for only the missing evidence needed to distinguish them.
- Gate on severe unsupported claims: fabricated deadlines, compensation entitlements, eligibility, source citations or company contacts must be blocked from the letter and shown as unknown.
- Keep score labels descriptive of evidence coverage, not probability of winning.

### Phase 5 — Provenance and security controls (run history and atomic reanalysis implemented; integration verification remains)

- Add immutable `analysis_runs` records linked to the owner-scoped case; store pack/model/prompt versions, user evidence IDs/hashes, source snapshot metadata, typed claims/grounding, conflicts, warnings, result and timestamp.
- Keep documents private under RLS and server-side ownership checks. Continue to keep service-role secrets server-only.
- Export the user’s complete case and run history with evidence/source attribution, never hidden provider secrets.
- Add retention/deletion behavior for snapshots and document text; do not save guest cases.
- Add prompt-injection, SSRF and PII/logging threat cases before enabling direct page fetching or increasing provider context.

### Phase 6 — Representative evaluation set (deterministic v1 baseline and v2 candidate set implemented; expert labeling and model evaluation remain)

Create a redacted, versioned evaluation set across all three packs and three jurisdictions, including cases where the correct outcome is “unknown” or “no authoritative source found.” Include listed/unlisted companies, changed policy dates, source outages, missing facts, conflicting documents and prompt injection.

Measure retrieval and generation separately:

- Retrieval: official-source rate, required-source recall/precision at top K, jurisdiction match, fetch success, source freshness status and correct abstention rate.
- Validation: exact quote/offset accuracy, claim relation precision/recall, contradiction detection, source authority correctness and applicability classification.
- Output: unsupported material claim rate, invented-fact rate, invalid citation rate, preserved uncertainty, letter fidelity to the user's original facts and clarity of limitations.
- Security: prompt-injection resistance, redirect/domain mismatch, SSRF blocks, secret exposure, PII in logs, and cross-account access tests.

Use expert human labels for a held-out, domain-reviewed subset. LLM-as-judge can help triage regressions but must not be the release gate by itself. ARES separates context relevance, answer faithfulness and answer relevance, and uses human-labeled validation with prediction-powered inference; RAGTruth demonstrates that retrieved answers can still contain unsupported or contradictory spans. [ARES paper](https://aclanthology.org/2024.naacl-long.20.pdf), [RAGTruth paper](https://aclanthology.org/2024.acl-long.585.pdf)

### Phase 7 — Integration and live acceptance (deferred)

Only after the above implementation and regression suite are ready:

1. Check provider configuration/status without exposing credentials; configure the model, Tavily, Supabase Auth/Postgres and production budget limiter.
2. Apply and verify the migration in a non-production Supabase project; verify email verification and safe callback URLs.
3. Run one live pipeline request using synthetic documents and an invented company response. Inspect retrieved pages and the full source-to-claim trace before trusting the output.
4. Test signup, verification, sign-in, password reset, explicit save, saved review, reanalysis, export, case deletion and account deletion with two accounts.
5. Prove account A cannot read/update/export/reanalyze/delete account B's case through both API calls and direct RLS-protected queries.
6. Confirm guest requests create no database row, save is opt-in, and the edited draft is what gets saved/exported.
7. Re-run desktop/mobile route checks, keyboard and screen reader review, reduced motion, provider error/timeout states, and full lint/typecheck/regression/build checks.

No live status check or provider request was made while creating this plan.

## Release Gates

- No claim can enter the letter without a claim ID, supporting evidence IDs, and a resolved server-owned citation record.
- Every source-backed label links to the underlying retrieved page and exact passage; snippet-only, stale, failed or unreviewed content stays visibly provisional.
- Applicability requires the needed jurisdiction, date and scope facts; otherwise the result states what remains unknown.
- All three dimensions—traceability, authority, applicability—are independently visible.
- Company/source entries never imply eligibility or guaranteed remedy.
- Full saved-case review/export includes provenance and conflicts; guest analyses remain unpersisted unless the user explicitly opts in.
- No route sends letters, files complaints, or contacts a company.
- Two-account isolation, prompt-injection, source-change, and provider-failure suites pass before calling the app complete.

## Research References Opened

- [NIST AI RMF: Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) — confabulation and citation risks.
- [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) — untrusted documents and retrieved pages.
- [Tavily Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search) and [Tavily Extract API](https://docs.tavily.com/documentation/api-reference/endpoint/extract) — candidate discovery vs selected-URL extraction.
- [IETF RFC 9110 §8.8](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.8) — entity tags and modification validators.
- [W3C PROV-O](https://www.w3.org/TR/prov-o/) — provenance model.
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — owner-scoped access.
- [Legal Aid NSW: Using generative AI in the legal system](https://www.legalaid.nsw.gov.au/ways-to-get-help/representing-myself/using-generative-ai-in-the-legal-system) — jurisdiction and advice limits.
- Current catalog sources previously opened directly: [Air India passenger rights](https://www.airindia.com/in/en/passenger-rights.html), [DGCA passenger rules](https://www.dgca.gov.in/digigov-portal/Upload?attachId=we1PSlOuQhYdHcwKKrm7ew%3D%3D&flag=iframeAttachView), [EU passenger rights](https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_en.htm), [Netflix cancellation](https://help.netflix.com/en/node/407), and [FTC subscription guidance](https://consumer.ftc.gov/articles/getting-and-out-free-trials-auto-renewals-and-negative-option-subscriptions).
