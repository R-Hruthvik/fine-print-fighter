# Fine Print Fighter — product and implementation specification

Version: 0.2 draft · Updated: 2026-10-23

This specification expands the project outline in [README.md](../README.md). It describes the intended MVP and records the gaps in the existing scaffold. Requirements below are targets unless explicitly marked as implemented. Legal rules, eligibility, contacts, and deadlines must be established from applicable sources during research; this document does not establish them.

The text workflow is now implemented. See [implementation status](implementation.md) for current behavior and remaining release gates. The baseline and HTTP table below describe the original scaffold; current stage endpoints are development-only and use registered pack IDs. Current letters use a deterministic English template with quoted evidence and explicit applicability questions.

## 1. Product outcome

You provide the text of a company bill, notice, or email and select a dispute category and jurisdiction. You receive extracted facts, an assessment with traceable evidence, a complaint letter you can edit, and sourced escalation options. You review and send the letter yourself.

The primary user is a consumer who needs help organizing a dispute and explaining a requested remedy. The product must present evidence both for and against the consumer's position and identify what remains unknown.

The README's under-90-second goal is a performance target, not a measured guarantee. A result with insufficient evidence must say so rather than fill gaps with generated claims.

## 2. MVP scope

| Area | MVP requirement |
| --- | --- |
| Disputes | Flight delay/cancellation, subscription cancellation, surprise bill/fee |
| Jurisdiction | `IN`, `EU`, `US` as initial research scopes; request more detail when applicability depends on route, member state, state, or sector |
| Input | Pasted text and UTF-8 `.txt`/`.md` files |
| Analysis | Facts, research, findings, evidence strength, missing evidence, requested remedy, escalation |
| Letter | Editable text with source-backed citation markers and placeholders for missing personal details |
| Export | Download current letter as text; print current letter with citations |
| Providers | NVIDIA Nemotron through Nebius Token Factory and Tavily research |
| Storage | Transient case state; no application database in the MVP |

PDF parsing, image OCR, accounts, payments, saved case history, automatic sending, filing complaints, and representation are outside this MVP. Language is an optional generation preference; accuracy in any particular language is not established until evaluated.

## 3. Current implementation baseline

The repository contains a Next.js App Router application, three JSON rule packs, typed pipeline functions, seven POST routes, and a client interface with input, progress, and results views.

| Capability | Observed behavior | Remaining requirement |
| --- | --- | --- |
| Intake | Pasted text and text MIME uploads; UI advertises `.txt`/`.md` | Consistent extension/MIME validation, size limits, empty-file feedback |
| Orchestration | `/api/extract` runs the entire pipeline | Preserve this contract while adding validation and failure handling |
| Progress | Timer is created after awaiting the request; stage display is simulated | Show an honest indeterminate state or actual server events |
| Research | Queries run sequentially; each result is truncated to 600 characters | Bound queries, deduplicate URLs, retain enough text for verification, report failures |
| Verification | Checks whether at least one supplied source ID exists | Validate every reference, matching passage, and applicability; model output alone cannot verify a claim |
| Scoring | Model generates rating and reasons | Enforce rating constraints in application code |
| Compensation | Always returns `noAmountFound`; may expose a disputed amount | Currency-aware parsing and sourced calculation rules |
| Drafting | Receives findings but not the source registry; name parameter is unused | Generate citation metadata from known sources and use supplied name |
| Export | Editor is uncontrolled; download reads the original result | Store edits and export the latest text |
| Escalation | Model uses jurisdiction-specific strings in packs plus research sources | Validate applicability and provenance of each actionable step |
| Unknowns | Evaluation returns `unverified` and `unanswered`; orchestration drops them | Return and display both |
| Provider safety | JSON parsing uses type assertions and recursive repair | Runtime schemas, bounded attempts, timeouts, sanitized errors |

The current source ID convention is `s1`, `s2`, etc. Evaluation presents sources as numeric labels, creating a mismatch with those IDs. Fix the convention before relying on citation badges.

## 4. User journey and acceptance criteria

### 4.1 Provide a case

You select a dispute type and jurisdiction, then paste or upload document text. Optional fields are name, desired outcome, letter language, and requested reply period. Defaults remain India, flight delay, English, and a requested reply period of 14 days. The reply period is a user request, not a statutory deadline.

Acceptance criteria:

- Require non-whitespace document text, a registered pack ID, and a supported jurisdiction on both client and server.
- Proposed limits: 30,000 document characters, 256 KiB total request body, 200 characters for name, 2,000 for desired outcome, 80 for language, and 100 for requested reply period. Reject excess input explicitly; do not silently truncate the document.
- Validate file content as text and explain unsupported formats before starting analysis.
- Tell you that document text is sent to the model provider and minimized search queries are sent to the research provider.
- Keep your entered text when validation or provider calls fail.
- Prevent duplicate submissions while a request is active.

### 4.2 Review analysis

Results show the dispute summary, extracted facts, evidence strength and reasons, supporting and opposing findings, missing evidence, research limitations, remedy information, letter, and escalation options.

Acceptance criteria:

- Distinguish document statements, calculated values, and unknown information. Never present an inferred fact as a direct quotation.
- Every evidence-backed finding links to its source, passage, and retrieval timestamp.
- Unknowns, conflicts, and research failures remain visible in the final result.
- A zero-source result uses an explicit insufficient-evidence state. It cannot receive a strong rating or claim sourced legal eligibility.
- Display the selected jurisdiction and any unresolved applicability questions.
- New-case action clears the previous result and offers a clear way to clear entered personal information.

### 4.3 Review and export a letter

Acceptance criteria:

- Use supplied personal details; otherwise retain clear placeholders.
- Include only validated rules and policy assertions. Keep unsupported conclusions out of the letter.
- Treat the requested remedy separately from an established entitlement.
- Keep requested reply periods distinct from sourced procedural deadlines.
- Resolve every citation marker through the source registry; reject unknown markers and model-invented URLs.
- Download and print the current edited letter, with its citation list. Printing must not require exposing the entire case document.
- Do not send, file, or contact any organization automatically.

## 5. Pipeline requirements

The server owns the ordered pipeline. Individual stage routes are development interfaces, not a mechanism for clients to assert that evidence is verified.

| Stage | Input | Output and invariant |
| --- | --- | --- |
| Extract | Document, registered pack | Facts and document provenance; missing fields remain unknown |
| Plan | Facts, jurisdiction, pack templates | At most six nonempty queries, labeled rules/company policy/similar cases |
| Research | Validated queries | Deduplicated source registry plus explicit search warnings |
| Evaluate | Facts, sources, pack evaluation instructions | Findings, unsupported hypotheses, unanswered questions, conflicts |
| Verify | Candidate findings, source registry | Application-checked references/passages; unresolved applicability remains explicit |
| Score | Validated findings and coverage | Constrained rating, reasons, evidence to gather |
| Remedy | Facts, validated rules, pack logic | Requested refund or sourced estimate with currency, assumptions, and working |
| Draft | Facts, validated findings, remedy, preferences, source registry | Letter with application-resolved citation metadata |
| Escalate | Selected jurisdiction, facts, vetted pack entries, sources | Ordered applicable steps with provenance or explicit verification needed |

Compensation is a separate internal stage even though the current progress list has seven labels. Documentation and any future progress events must reflect actual execution.

### Evidence rules

1. Use stable string source IDs throughout prompts, schemas, findings, and exports. Numeric letter markers are a separate display mapping created by the application.
2. Reject findings with unknown references. A matching ID is necessary but does not prove a statement.
3. Check a supporting passage against retained source text with documented whitespace normalization. Reject fabricated or materially altered passages.
4. Report source type and relevance. Prefer applicable official rules and the company's own policy; similar disputes provide context and do not establish eligibility.
5. Matching a quote establishes traceability only. Applicability and claim support require separate checks; label the UI “source-backed” rather than implying independent legal verification.
6. Preserve opposing findings and conflicting passages. Do not select evidence solely because it favors a refund.
7. Do not infer currency, rule effective dates, geographic coverage, or contact details from a company name alone.

### Evidence strength

Retain `strong`, `medium`, and `weak` for compatibility, and add a separate evidence-coverage status such as `sufficient`, `limited`, or `none`.

- Strong requires at least one source-backed customer finding with applicable support, no verified finding that clearly defeats the claim, and no unresolved critical applicability fact.
- Medium applies to relevant but incomplete or conflicting support.
- Weak applies when support is absent, mostly unclear, or favors the company. Distinguish missing evidence from evidence against the claim in the explanation.
- Ratings describe available evidence, never a probability of winning. Enforce upper bounds in code even if the model proposes a stronger rating.

### Remedy and money

Keep the disputed charge, a requested refund, and an entitlement estimate separate. A documented charge is not proof that a refund is owed. Any calculated amount needs currency, sourced formula, source ID, input values, assumptions, and working. If any required element is missing, return no estimate and explain the missing evidence.

Do not coerce arbitrary formatted strings with `Number(...)` and treat the result as a reliable monetary value. Preserve the original text and require unambiguous currency and number formatting before calculation. Pack compensation prose is guidance for evaluation, not executable calculation logic.

## 6. Data contracts

Current TypeScript contracts live in [src/lib/types.ts](../src/lib/types.ts). Add runtime validation at every HTTP and provider boundary; generic JSON type parameters do not validate responses.

| Entity | Required evolution |
| --- | --- |
| Facts | Preserve extracted value, document passage/location where available, and unknown/inferred status |
| Source | Keep ID, safe HTTP(S) URL, title, retained text, retrieval time; add source type and applicability metadata |
| Finding | Keep ID, statement, stance, source IDs, passage; add traceability/applicability status and rejection reasons |
| Score | Keep rating/reasons/evidence to gather; add coverage status |
| Compensation | Add currency and distinguish disputed charge, request, and estimate |
| Escalation step | Add applicability status and provenance from a source or reviewed pack entry |
| Pipeline result | Preserve existing fields; add unanswered questions, unsupported hypotheses, conflicts, warnings, jurisdiction, and run metadata |

Use one normalized representation for missing fields in the future contract. Adapt existing `"not stated"` values explicitly rather than treating them as real data. Migrate the client, all stage routes, and orchestration together when nested shapes change.

## 7. HTTP interface

All existing routes are JSON POST endpoints. There is no authentication, persistence, or streaming protocol. Production analysis uses shared rate limits; development stage routes are disabled outside development. The table records current contracts, not a claim that their validation is complete.

| Endpoint | Current request fields | Current success body |
| --- | --- | --- |
| `/api/extract` | `documentText`, `companyResponse`, `packId`, `country`; optional up to three `additionalDocuments`, `userName`, `desiredOutcome`, `language`, `replyDeadline` | Full `PipelineResult` |
| `/api/plan` | `facts`, `packId`, `country` | `{ queries }` |
| `/api/research` | `queries: { query, targets }[]` | `{ sources }` |
| `/api/evaluate` | `facts`, `sources`, `evaluationPrompt` | `{ findings, unverified, unanswered }` |
| `/api/score` | `findings` | `CaseScore` |
| `/api/draft` | `facts`, `findings`, `letterTemplate`; optional compensation, escalation ladder, and letter preferences | `{ letter, citations }` |
| `/api/escalate` | `escalationLadder`, `country`, `sources` | `{ ladder }` |

The existing error format is `{ error: string }`, with basic validation returning 400 and caught failures returning 500. Keep the `error` string compatible and add `code`, optional `stage`, `retryable`, and `requestId`.

Target error handling:

| Status | Meaning |
| --- | --- |
| 400 | Malformed JSON or invalid field values |
| 413 | Body or document exceeds limits |
| 429 | Application request budget exceeded |
| 502 | Provider failed or returned invalid output after bounded attempts |
| 503 | Required provider configuration unavailable |
| 504 | Analysis deadline exceeded |
| 500 | Unexpected application failure with a safe public message |

Resolve templates and evaluation instructions from registered pack IDs on the server. Before exposing stage routes publicly, either restrict them to development or make them enforce the same provenance and validation rules as the orchestrated path. Never trust a client-supplied `verified: true` flag.

## 8. Rule pack specification

Packs currently contain `id`, `name`, extraction field names, query templates, preferred domains, evaluation instructions, compensation guidance, letter structure, and jurisdiction-specific escalation strings. They require manual registration in `src/lib/packs.ts` and the case type list. Current `preferredDomains` values are empty and are not used by research.

Target pack requirements:

- Validate pack shape and reject duplicate IDs at load time.
- Add pack version, last review date, required applicability facts, and source provenance for actionable escalation entries.
- Treat existing escalation strings as unreviewed candidates until backed by applicable sources or reviewed metadata.
- Support typed extraction fields and missing-data requirements; gather sector for billing disputes and route/location details for flight disputes when relevant.
- Respect preferred domains as ranking guidance while still checking source applicability.
- Derive the case selector from the registry so adding an ordinary pack needs one JSON file and one registration.
- Keep specialized monetary formulas in reviewed, testable calculation code when configuration alone cannot express them safely.

## 9. Reliability, privacy, and accessibility

Proposed initial operating limits, to tune using measured runs:

- One initial model attempt and at most one repair/retry per stage; no recursive repair. Retry only failures that can improve, within the remaining run budget.
- At most six research queries, five results per query, and three concurrent searches. Deduplicate before evaluation.
- A 120-second overall server deadline, with per-call timeouts capped by remaining time. Cancel outstanding work when the run expires. Deployment request-duration support must be checked before release.
- Record stage durations, provider status, counts, and request IDs. Exclude document text, personal details, secrets, and raw provider payloads from routine logs and public errors.
- Measure the under-90-second target over at least 20 representative configured-provider runs, reporting median, p95, failures, model identifier, and input sizes.

Missing credentials must fail clearly before analysis begins. Distinguish zero search results from a search outage. When research fails, show a degraded result only if the interface clearly identifies unavailable evidence and avoids unsupported claims; otherwise fail with a retryable message.

Keep provider keys and Upstash credentials on the server. Minimize search queries to company/product/jurisdiction and relevant issue details; exclude names, addresses, account numbers, and full document text. Treat uploaded text and retrieved content as untrusted data rather than instructions. Render generated text as text and allow only safe HTTP(S) source links. Production analysis requires shared per-IP and global daily budgets; configure a measured spend cap before making the route public.

The MVP does not deliberately persist case content. Do not describe this as zero retention: provider and hosting retention settings must be reviewed and disclosed separately.

Every field needs a visible label; errors and progress need accessible announcements. Support keyboard use, readable contrast, mobile layouts, and text labels for evidence status. Preserve edits during printing and download.

## 10. Delivery sequence and completion gates

### Milestone 1 — trustworthy pipeline

- Add runtime request/provider schemas and bounded JSON repair.
- Unify source IDs, verify passages, and build citation metadata from the source registry.
- Preserve unsupported hypotheses, unanswered questions, conflicts, and research warnings.
- Enforce score constraints and prohibit fabricated amounts or deadlines.
- Add provider timeouts, sanitized errors, and explicit missing-configuration handling.

Gate: controlled provider fixtures cover malformed JSON, wrong schema, unknown IDs, fabricated quotes, no evidence, opposing evidence, and outages. None can produce a falsely source-backed finding or strong unsupported rating.

### Milestone 2 — complete text-case workflow

- Validate upload and form limits, preserve input on errors, and prevent duplicate runs.
- Use honest progress, accessible status messages, and linked evidence.
- Store letter edits and use them for download and print.
- Resolve escalation for the selected jurisdiction only and display provenance gaps.
- Clarify no-estimate states and separate requested remedies from established entitlements.

Gate: a text case can be submitted, reviewed, edited, downloaded, printed, and reset. Failed runs preserve input; exports match the editor.

### Milestone 3 — release evidence

- Validate and review all three packs and supported jurisdiction combinations.
- Keep minimized search queries and safe logging; configure shared request budgets and deployment deadline checks before launch.
- Evaluate representative supported, opposing, insufficient-evidence, and conflicting-source cases for each pack.
- Run configured-provider checks and collect latency and failure measurements.
- Update README claims to match measured capabilities.

Gate: lint, TypeScript checking, and production build pass; focused pipeline regression checks and workflow checks pass; all generated factual citations in the release fixture set resolve to retained evidence. Review source applicability manually for that fixture set. Record remaining coverage limits.

No configured-provider success or legal coverage audit is implied by this document. Acceptance gates remain open until results are recorded.

## 11. Deferred decisions

Decide these when the corresponding work becomes necessary:

- PDF/image parsing and OCR provider, upload retention, and document size limits.
- Additional jurisdiction selectors and which pack/jurisdiction combinations can be supported with sufficient evidence.
- Supported letter languages and language-specific evaluation fixtures.
- Public hosting, provider budgets, retention settings, and production model availability.
- Durable sessions and authenticated access if saved cases are introduced.

Until then, implement the text workflow and evidence requirements above without depending on accounts, a database, or automatic sending.
