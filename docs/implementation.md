# Implementation status

Updated: 2026-10-24

The text-case workflow is implemented. The original scaffold baseline in the specification is historical; this file records the resulting behavior and open release gates.

## Application behavior

Intake validates document text, text files, registered packs, jurisdiction, and optional preferences. Errors keep the entered document. Running requests can be canceled; the progress display does not claim individual stages have completed.

The server validates model output at runtime, grounds extracted field values in the supplied text, and labels the model's dispute summary as inferred. It generates research queries from pack templates using a narrow entity allowlist and excludes common account, email, phone, and address patterns. This is data minimization, not a general-purpose anonymization guarantee.

Research runs at most three searches concurrently, six total, with five results each. Sources are deduplicated and retained text is capped at 6,000 characters per source. A traceability check requires every reference to exist and a matching passage in each cited source. Unknown applicability remains visible and caps ratings. Conflicts, unsupported possibilities, search warnings, and unanswered questions survive orchestration.

The complaint letter is constructed in code in English. It uses grounded document fields and user-supplied requests, quotes matched source passages, and asks the company to confirm applicability. It does not generate new legal assertions, contacts, compensation formulas, or procedural deadlines. Current edits are used in text and print exports. Printing excludes the full case document.

Rule packs have versions, required applicability facts, and review dates. Their review dates remain unset. Escalation bodies therefore remain clearly labeled unreviewed suggestions. Numeric disputed charges need an explicit currency; they are never represented as refund entitlements.

## Runtime controls

- 256 KiB actual streamed request limit and 30,000-character document limit.
- Explicit optional-field type/length checks and supported pack/jurisdiction checks.
- Initial model attempt plus at most one retry/repair; no recursive repair.
- Model call timeout 25 seconds, research call timeout 15 seconds, overall analysis deadline 120 seconds.
- Process-local budget: 12 analyses per minute, at most three concurrent analyses.
- Development stage endpoints disabled unless explicitly enabled; never enabled in production.
- Safe public errors and case-free routine timing/count logs.
- No database, saved cases, automatic sending, or provider key exposure in client code.

## Verification and remaining release gates

Automated regressions cover intake boundaries, streamed request limits, malformed model JSON/schema, bounded retries, fabricated references/passages, opposing and absent evidence, cancellation before paid requests, grounded money/currency, minimized queries, cited letter construction, and current-text exports. Fixture-backed pipeline checks exercise all three launch packs across all three research scopes; these check software behavior, not legal coverage.

Verification on 2026-10-23: 45 regression tests pass, ESLint passes, TypeScript checking passes, and the production build passes. The build needed an unsandboxed run because this environment suppresses detached TypeScript worker output in the sandbox. No type checks were disabled.

The following gates still require external evidence rather than local fixtures:

- Confirm the configured model is available on the target Nebius account and evaluate real extraction and interpretation quality.
- Run at least 20 representative configured-provider cases and report median/p95 latency and failures. No under-90-second performance claim is made.
- Review all pack/jurisdiction combinations for applicability and escalation provenance before enabling independently supported applicability or strong ratings.
- Implement and review compensation formulas before displaying entitlement estimates.
- Review provider/hosting retention and enforce a shared request budget if deployed across multiple instances.
- Add and evaluate additional letter language templates before offering translation.

No credentials were added or modified, and no paid provider requests are needed for local regression tests.

## Browser verification

Browser checks confirmed the desktop intake controls and no desktop horizontal overflow. A browser-only response fixture then rendered the results screen. Editing the letter changed the controlled editor, print copy, and downloaded Blob contents; the export retained its citation list. The results screen had no horizontal overflow at a 390-pixel mobile viewport. Test fetch overrides were removed and the app was reloaded afterward. These checks do not represent a live model/provider run.

## Hackathon direction

The Rebuttal Lab investigation and evidence-revision loop described in the [design spec](superpowers/specs/2026-10-23-rebuttal-lab-design.md) is implemented. It separates the company response from consumer facts, retains exact source passages, requests a targeted exhibit, and supports up to three separately identified exhibits on recheck. The result UI keeps fictional-sample disclosure, model attribution, and before/after reviews visible.

The [positioning research](research/2026-10-23-hackathon-positioning.md) describes the product direction. Remaining external gates include real Nebius model verification, jurisdiction review, public deployment, and shared request limiting for multi-instance hosting. See [the deployment guide](deployment.md); this document does not claim that a public demo has been deployed.
