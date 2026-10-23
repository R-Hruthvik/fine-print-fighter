# Rebuttal Lab: proposed hackathon upgrade

Status: research-backed design; not yet implemented.

Based on [the competition and platform research](../../research/2026-10-23-hackathon-positioning.md). This design changes the flagship interaction while retaining the existing intake, source registry, timeout/error controls, and export infrastructure.

## Product purpose

Help a consumer respond to an actual rejection by exposing the strongest explanation on each side and showing what evidence would change the assessment.

The central screen is an inspectable argument map, not a generic chat or a long generated report. The initial demonstration covers one subscription dispute. Existing flight/billing packs remain available without being represented as equally deep investigations.

## Approach and scope decision

The recommended approach is denial-centered investigation with an evidence-change comparison. Historical policy lookup is a stretch feature, and autonomous calling and community pattern discovery are deferred. These are implementation recommendations, not user-approved claims of global novelty.

## User-visible sequence

1. Add a bill, the company's rejection, and optionally the relevant policy as separate exhibits.
2. Inspect up to three grounded rejection challenges.
3. Open one challenge and see the company's explanation, the consumer's support, the source passages, and the unresolved condition.
4. Follow actual investigation actions: policy search, selected-page extraction, passage comparison, request for a missing exhibit.
5. Add new evidence. Compare the old challenge state with the new state and the passage that caused the change.
6. Edit/export a revised response and evidence appendix.

Each action event reports the tool, its public purpose, the source it produced, its outcome, and timing. Do not expose raw model chain of thought or fabricate progress events.

## Proposed data boundaries

- **Exhibit:** stable ID, role (`bill`, `denial`, `policy`, `confirmation`, `other`), title, text, content hash, date if explicitly stated.
- **Evidence reference:** exhibit/source ID plus exact passage and character offsets when available.
- **Challenge:** stable ID, exact denial claim/reference, company explanation, consumer argument, supporting/opposing references, unresolved conditions, current status.
- **Investigation event:** tool name, challenge ID, safe arguments summary, source/result IDs, start/end times, success/failure.
- **Revision:** previous challenge ID/status, current status, new evidence references, short reason, unresolved conditions.

Proposed challenge statuses: `needs-evidence`, `consumer-supported`, `company-supported`, `contested`. A status describes the supplied record, not legal eligibility or likely court outcome.

## Agent responsibilities

The investigator chooses a tool based on an unresolved challenge. A company-side reviewer looks for the strongest defensible explanation, including policy exceptions and incomplete cancellation. An evidence checker validates referenced IDs and passages and rejects unsupported conclusions. These roles can use the same model; role separation is not proof of independence or correctness.

Bound the loop initially to four tool executions per investigation and the existing overall analysis deadline. Tool names and parameters are schema-validated. Only registered tools run; no arbitrary code or user-supplied URLs are fetched directly by the server. Policy page reading goes through Tavily Extract after safe URL checks.

Tools proposed:

- `search_company_policy`: company, relevant issue and research jurisdiction; minimized query.
- `read_policy_page`: URL from the current candidate registry.
- `compare_evidence`: known exhibit/source IDs and claim ID.
- `request_evidence`: one specific missing document or fact and why it matters.
- `finish_investigation`: structured challenges and evidence references.

Native model tool calling is the preferred execution path, subject to a real endpoint capability test. A validated structured action selector is an explicit fallback, not a reason to claim native tools were used when they were not.

## Evidence-change rules

New documents never automatically increase a strength score. Recheck only the facts they can affect, preserve stable challenge IDs, and show changes alongside unchanged challenges. Missing, irrelevant, contradictory, or unfavorable documents must have honest outcomes.

A cancellation request is not interchangeable with confirmation of completed cancellation. A capture date is not an effective contract date. A later charge is not automatically an unlawful charge. These are distinctions the demonstration should make visible.

## Response construction

Keep exact source quotations and app-generated citation metadata. Tie each proposed response paragraph to the challenge and evidence it addresses. Describe disputed facts and request a review; do not convert a model's interpretation into an established entitlement. User edits remain editable and exportable.

## Demonstration and validation

Use an explicitly fictional sample case for deterministic UI replay and controlled regressions. Separately provide a live-provider run with actual Nemotron decisions and actual tool results. Show a revision caused by a relevant document and a counterexample where the company-side explanation survives.

Regression fixtures must cover invented spans, unknown IDs, contradictory proof, irrelevant proof, forged completion flags, policy extraction partial failure, loop exhaustion, cancellation, and consistent current-text export. A fixture demonstration does not establish model capability, source availability, speed, or legal accuracy.

## Delivery order

1. Current platform configuration and real model capability check.
2. Exhibit/source-span contracts and challenge extraction.
3. Model-selected bounded tools and real event delivery.
4. Company-side challenge and evidence revision.
5. Interactive challenge board and response export.
6. Live evaluation, counterexample demo, and submission assets.

The first release excludes automatic emailing, phone calls, filing, accounts, and probabilistic success claims. Historical policy lookup and visual document ingestion follow only after the core evidence-change loop is demonstrable.
