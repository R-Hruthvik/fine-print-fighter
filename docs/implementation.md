# Implementation status

Updated: 2026-10-24

The text-case workflow is implemented. The original scaffold baseline in the specification is historical; this file records the resulting behavior and open release gates.

## Application behavior

Intake validates document text, text files, registered packs, jurisdiction, and optional preferences. Errors keep the entered document. Running requests can be canceled. The first-party interface streams actual pipeline stage starts/completions and completed registered tool actions; this timeline is produced by the application and does not verify the configured provider or its output quality.

The server validates model output at runtime, grounds extracted field values in the supplied text, and labels the model's dispute summary as inferred. It generates research queries from pack templates using a narrow entity allowlist and excludes common account, email, phone, and address patterns. This is data minimization, not a general-purpose anonymization guarantee.

Each `researchWithWarnings` call handles at most six queries in batches of three, with up to five results per query. The initial plan is bounded to six queries; the investigation loop may execute up to four additional one-query searches. Sources are deduplicated and retained text is capped at 6,000 characters per source. A traceability check requires every reference to exist and a matching passage in each cited source. Unknown applicability remains visible and caps ratings. Conflicts, unsupported possibilities, search warnings, and unanswered questions survive orchestration.

The complaint letter is constructed in code in English. It uses grounded document fields and user-supplied requests, quotes matched source passages, and asks the company to confirm applicability. It does not generate new legal assertions, contacts, compensation formulas, or procedural deadlines. Current edits are used in text and print exports. Printing excludes the full case document.

Rule packs have versions, required applicability facts, and review dates. Their review dates remain unset. Escalation bodies therefore remain clearly labeled unreviewed suggestions. Numeric disputed charges need an explicit currency; they are never represented as refund entitlements.

## Runtime controls

- 256 KiB actual streamed request limit and 30,000-character document limit.
- Explicit optional-field type/length checks and supported pack/jurisdiction checks.
- Initial model attempt plus at most one retry/repair; no recursive repair.
- Model calls time out after 25 seconds and research calls after 15 seconds, within a 120-second overall analysis deadline. Provider timeouts return a safe retryable 504; caller cancellation returns the analysis-timeout error.
- Production: Upstash-backed rolling budget of 12 requests per trusted IP per minute and a required global daily request cap. Per-IP identifiers are HMACed; production fails closed when shared limit configuration is unavailable. Development uses a process-local 12-per-minute budget. Each process allows at most three concurrent analyses.
- `/api/extract` keeps its JSON response by default and can stream real stage transitions and completed registered tool actions as NDJSON to the first-party interface. The stream ends with the same pipeline result or a safe structured error; progress contains no case text or model-supplied claims.
- Development stage endpoints disabled unless explicitly enabled; never enabled in production.
- Safe public errors and case-free routine timing/count logs.
- Safe provider error messages now reach the user; upstream response bodies remain private. HTTP 402 produces a nonretryable provider-account action message, and per-search timeouts reduce evidence coverage without aborting the overall analysis.
- No database, saved cases, automatic sending, or provider key exposure in client code.

## Verification and remaining release gates

Automated regressions cover intake boundaries, streamed request limits, malformed model JSON/schema, bounded retries, fabricated references/passages, opposing and absent evidence, cancellation before paid requests, grounded money/currency, minimized queries, cited letter construction, and current-text exports. Fixture-backed pipeline checks exercise all three launch packs across all three research scopes; these check software behavior, not legal coverage.

Historical verification on 2026-10-23: 45 regression tests passed, ESLint passed, TypeScript checking passed, and the production build passed. The build needed an unsandboxed run because this environment suppresses detached TypeScript worker output in the sandbox. No type checks were disabled.

Local verification on 2026-10-24: ESLint, TypeScript checking, and the production build passed. Browser harness review confirmed the offline evidence walkthrough, its remove/irrelevant/restore/edit states, and the first-screen link. The local NDJSON endpoint returned its safe configuration error because provider credentials are unavailable; a successful live provider stream remains unverified. No test suite was run in this verification pass.

The following gates still require external evidence rather than local fixtures:

- Confirm the configured model is available on the target Nebius account and evaluate real extraction and interpretation quality.
- Run at least 20 representative configured-provider cases and report median/p95 latency and failures. No under-90-second performance claim is made.
- Review all pack/jurisdiction combinations for applicability and escalation provenance before enabling independently supported applicability or strong ratings.
- Implement and review compensation formulas before displaying entitlement estimates.
- Review provider/hosting retention and set the required global analysis cap from measured provider cost before deployment.
- Add and evaluate additional letter language templates before offering translation.

No credentials were added or modified, and no paid provider requests are needed for local regression tests.

## Browser verification

Browser checks confirmed the desktop intake controls and no desktop horizontal overflow. A browser-only response fixture then rendered the results screen. Editing the letter changed the controlled editor, print copy, and downloaded Blob contents; the export retained its citation list. The results screen had no horizontal overflow at a 390-pixel mobile viewport. Test fetch overrides were removed and the app was reloaded afterward. These checks do not represent a live model/provider run.

## Hackathon direction

The Rebuttal Lab investigation and evidence-revision loop described in the [design spec](superpowers/specs/2026-10-23-rebuttal-lab-design.md) is implemented. It separates the company response from consumer facts, retains exact source passages, requests a targeted exhibit, and supports up to three separately identified exhibits on recheck. The result UI keeps fictional-sample disclosure, model attribution, and before/after reviews visible.

The [positioning research](research/2026-10-23-hackathon-positioning.md) describes the product direction. The intake also includes an offline fictional evidence walkthrough built on the same exact-passage matcher as the live investigation. Remaining external gates include real Nebius model verification, jurisdiction review, public deployment, and choosing the global request cap from measured provider cost. See [the deployment guide](deployment.md); this document does not claim that a public demo has been deployed.
