# Company Reply Workspace Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to execute task by task. Checkboxes track work.

**Goal:** Build a focused, honest customer workspace for reviewing a company's response against the customer's records.

**Architecture:** A single composer accepts a description and role-labeled text documents. A server-side case review extracts attributed claims, presents document-based observations, runs bounded research where needed, and streams real progress; the UI shows a focused brief and editable reply. A follow-up uses an honest full rerun and comparison; durable incremental recomputation is deferred.

**Tech Stack:** Next.js, React, TypeScript, existing provider, Tavily, Node test runner.

**Spec:** Gemini 4 Argon response in the user-provided `answers.md` in the original checkout (lines 1270–2452); the user's one-day scope in conversation. This plan records the implementable choices and corrects unsafe assumptions.

## Global Constraints

- Read relevant installed Next.js documentation and project AGENTS.md before code changes.
- No inferred jurisdiction used for legal research until confirmed; no unsupported deadlines or entitlement claims.
- Quote presence proves provenance only. Dates for distinct events are not automatically contradictions.
- Search snippets are leads, not established legal or policy claims. Full text still needs applicability review.
- Existing input limits, budgets, cancellation, privacy and provider safeguards must remain effective.
- TXT/Markdown only; clearly explain unsupported formats. No invented progress, PDF/OCR, persistent guest storage, or incremental reanalysis claims.
- Keep a prior result and unsaved edits safe on failed/cancelled follow-up. No automatic sending.

## Review Focus

1. User account and company assertion disagree: preserve attribution and both passages.
2. Different event dates: do not manufacture a conflict; ask when genuinely unclear.
3. Missing jurisdiction or snippet-only research: do not assert applicability or deadline.
4. Unsupported file, cancellation, timeout: retain entered data and completed results.
5. A company may be right or evidence inconclusive: no automatic customer-favoring verdict.

## File map

- `src/components/FighterApp.tsx`: replace intake presentation, manage case inputs and recheck.
- `src/components/CaseResult.tsx`, `src/components/AnalysisProgress.tsx`: focused output and real progress.
- `src/app/globals.css` and existing component styles: responsive workspace and home-aligned theme.
- `src/app/api/prepare/route.ts`, `src/app/api/extract/route.ts`, `src/lib/pipeline.ts`: validated intake, streaming stages, budgets and orchestration.
- `src/lib/llm.ts`, `src/lib/rebuttal.ts`, `src/lib/tavily.ts`, `src/lib/types.ts`: role-aware claims, bounded research, provenance and structured output.
- Existing tests under `tests/` (locate matching files before adding tests); browser-harness for live customer checks.

## Phase 0 — Baseline and eligibility (1–2 hours; external access may block)

- [ ] Inspect provider configuration without exposing credentials; run one representative existing text case, recording actual model, duration, search mode, and outcome.
- [ ] Verify an eligible NVIDIA model on Nebius Token Factory using real runtime calls; if credentials or model access are absent, record blocker and continue independent local work without claiming eligibility.
- [ ] Confirm public-host and judge-access requirements from `docs/deployment.md`; do not claim a public deployment exists.
- [ ] Run `npm run verify` on a properly installed baseline and record results. Do not copy secrets into the worktree or Git.

## Phase 1 — Document-first intake and API contract (2–3 hours)

- [ ] Write a route-level test for a note plus multiple labeled text inputs, preserving separate company and customer material; reject invalid type, size, and aggregate length.
- [ ] Introduce explicit document IDs, roles and text in the input contract; preserve existing API callers and shared rate limits. Treat auto-classification as tentative and editable.
- [ ] If a decision needs jurisdiction and none is confirmed, return a targeted question; do not silently default country or infer it from currency/domain.
- [ ] Replace the multi-step form with a full-screen workspace: one composer, add/paste text files, removable attachment list, one review action. Provide keyboard-accessible upload and clear unsupported-file guidance.
- [ ] Test missing input, unsupported PDF/image, role correction, jurisdiction question, and retention after error. Run relevant existing tests and commit the finished slice.

## Phase 2 — Attributed case review (2–3 hours)

- [ ] Add tests for same-event contradiction, distinct-event dates, a valid company explanation, and no proof. Assert identities and exact passages remain visible and that absence of evidence is not proof of absence.
- [ ] Extract customer and company claims with document IDs and source roles; validate quotes against original text. Clearly mark unanchored statements and do not label matches as verified truth.
- [ ] Produce a brief with company response, what the documents say, unanswered points, uncertainty, and a suggested next action. Only label a conflict when the evidence actually supports that relation.
- [ ] Render one focused next step and compact claim comparisons; disclose evidence on demand and preserve editable draft functionality. Do not claim coverage of every company claim unless tested.
- [ ] Run meaningful attribution and conflict tests; commit the completed slice.

## Phase 3 — Research and progress (1–2 hours)

- [ ] Add tests for no jurisdiction, no search needed, search failure, and snippet-only results. A snippet may be displayed as a lead but cannot become an asserted policy or legal entitlement in a draft.
- [ ] Refactor current unconditional research into named decision-relevant questions; keep search bounded and ensure failures preserve document-only results. Current `evaluateFindings` returns no findings without sources, so explicitly separate document review from external findings.
- [ ] Stream only real server stages: document reading, comparison, targeted research, completion/failure. Render accessible progress, cancel and retry; never promise a fixed latency.
- [ ] Test an unavailable Tavily response and a successful search; check source identity and extraction mode. Commit this slice.

## Phase 4 — Follow-up and customer verification (2–3 hours)

- [ ] Add a follow-up company reply or evidence to the same case and retain the previous output and edited draft until the new analysis succeeds.
- [ ] Run the existing full pipeline again; show a clearly labeled before/after comparison based on actual results. Do not say only changed portions were recomputed.
- [ ] Test partial offer, unchanged issue, cancelled run, retry, and new evidence without assuming a prior customer confirmation cannot be superseded.
- [ ] Run `npm run verify`; use browser-harness on a fictional case at desktop and 390/320px, capture and inspect screenshots for intake, progress, result, follow-up, and failures. Verify copy/download and keyboard focus.
- [ ] Commit the completed slice and record known gaps and observed timings.

## Phase 5 — Submission only if eligible (1–2 hours)

- [ ] Repeat the real customer journey on the actual Nebius-backed deployment; record sanitized evidence and test judge access signed out.
- [ ] Produce the demo using `docs/demo/demo-production-plan.md`; show only implemented, observed behavior and label edited waits.
- [ ] If access, deployment or timing blocks submission, report the precise blocker; do not manufacture a demo or claim provider compliance.

## Deferred after one-day build

PDF text extraction and OCR; a persistent multi-case product; claim dependency graphs and selective reanalysis; broad jurisdiction-specific legal advice; automated filing; comparative evaluation with practitioners and real customers. Compare this narrow workflow against a strong chatbot before claiming it is superior.
