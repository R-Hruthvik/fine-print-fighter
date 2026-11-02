# Fine Print Fighter Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Implementation update:** The original audit below targeted local branch `ccc5844`. Execution starts from remote `main` at `327cf18`. Use the current-main triage appendix for changed runtime targets; the original task interfaces are historical where explicitly superseded.

**Goal:** Correct saved-case evidence restoration, conflict detection, case brief display, extracted company naming, and repository lint hygiene across the Fine Print Fighter review flow.

**Architecture:** Preserve each new workspace document's stable ID and explicit role in saved JSON, then restore only records with known customer-record roles to fact extraction and retain company replies as attributed reply evidence. Make conflict comparison event-aware and conservative, display the brief already returned by the pipeline, seed an empty company field from the extracted company, and configure ESLint to ignore generated worktrees.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node's built-in test runner, ESLint 9, Supabase JSONB case documents.

**Spec:** Five confirmed Fine Print Fighter review findings tracked by published issues #39–#43, linked below. This is a plan and audit record; no application fixes have been applied.

## Global Constraints

- Preserve the existing saved-case document and analysis JSON formats for already-saved cases; the existing JSONB column needs no SQL migration.
- Legacy additional documents have no trustworthy role metadata: do not infer or display customer/company attribution for them.
- Preserve exact document IDs, labels, text, and explicit roles for new saves and reanalysis.
- A validated conflict requires incompatible claims with the same explicit event reference, date, event type, and currency; a shared date alone is insufficient.
- Extracted company names remain document-derived candidate facts and must not overwrite a name the user entered.
- Preserve all pre-existing unrelated working-tree changes; implementation commits stage only the new task hunks.
- If a task hunk cannot be separated from unrelated pre-existing edits, defer that commit and report it rather than staging user work.
- OCR and editing missing facts are outside this remediation.

## Review Focus

- A saved supporting receipt with an explicit record role still contributes its extracted amount and source ID after reanalysis.
- A saved prior company reply remains attributed to the company and is not extracted as a customer record.
- Legacy saved documents without roles remain unattributed during reanalysis.
- Amounts following a date are compared as amounts only after an explicit shared event reference, date, event type, and currency match; a charge and refund on the same date are not conflated.
- An absent brief prop does not hide the pipeline result brief.

---

## Files and responsibility map

- `src/lib/saved-cases.ts`: persisted document types, validation, and legacy-compatible document normalization.
- `src/components/FighterApp.tsx`: map workspace documents into saved typed records and populate a blank company field from extracted facts.
- `src/app/api/cases/[caseId]/reanalyze/route.ts`: restore typed records and replies into their pipeline inputs.
- `src/lib/pipeline.ts` and `src/lib/claims.ts`: retain the saved current-reply document ID and label through company-claim extraction.
- `src/lib/claims.ts`: identify comparable event types and monetary values before returning a conflict.
- `src/components/CaseResult.tsx`: render `brief` prop or `result.brief`.
- `eslint.config.mjs`: exclude generated `.worktrees/**` from full-repository linting.
- `tests/saved-cases.test.ts`, `tests/pipeline.test.ts`, and `tests/claims.test.ts`: pin persistence, reanalysis, conflict, and company-name precedence to focused regressions.

## Task 1: Preserve typed documents through save and reanalysis

**GitHub issue:** [#39](https://github.com/R-Hruthvik/fine-print-fighter/issues/39)

**Files:**
- Modify: `src/lib/saved-cases.ts`
- Modify: `src/components/FighterApp.tsx`
- Modify: `src/app/api/cases/[caseId]/reanalyze/route.ts`
- Modify: `src/lib/pipeline.ts` and `src/lib/claims.ts`
- Test: `tests/saved-cases.test.ts` and `tests/pipeline.test.ts`

**Interfaces:**
- Define `SavedDocumentRole = "primary-record" | "customer-record" | "company-reply" | "previous-company-reply"`, `SavedCaseDocument = { id: string; label: string; text: string; role: SavedDocumentRole }`, and `LegacySavedCaseDocument = { label: string; text: string }` in `src/lib/saved-cases.ts`.
- Change `SaveCaseInput.documents` to `SavedCaseDocument[]`. Type saved reads as `(SavedCaseDocument | LegacySavedCaseDocument)[]`, where `LegacySavedCaseDocument = { label: string; text: string }`.
- New saves use stable existing workspace IDs and explicit roles. Preserve attachment IDs and labels. Use `primary-document` and `company-response` for primary and current-reply text fields when they do not come from an attachment.
- Add `restoreSavedCaseDocuments(documents: (SavedCaseDocument | LegacySavedCaseDocument)[]): { documentText: string; workspacePrimary?: { id: string; label: string }; workspaceRecords: { id: string; label: string; text: string }[]; companyResponse: string; companyResponseSource?: { id: string; label: string }; additionalDocuments: { id: string; label: string; text: string; role?: "previous-company-reply" }[] }` in `src/lib/saved-cases.ts`. Reanalysis sends only role=`customer-record` supporting documents to `workspaceRecords`; the role=`primary-record` document goes to `documentText`/`workspacePrimary`; the current company reply goes to `companyResponse` and `companyResponseSource`; previous replies go through `additionalDocuments` with their IDs and roles. Unknown legacy extras remain un-attributed `additionalDocuments`.
- Add optional `companyResponseSource?: { id: string; label: string }` to `PipelineOptions` and to `extractCompanyClaims`; use the existing default ID/label when omitted so other callers keep their behavior.

- [ ] **Step 1: Add failing persistence and restoration regressions**

  In `tests/saved-cases.test.ts`, make new-save fixtures use IDs and roles, assert validation preserves typed metadata and rejects new writes missing IDs, and assert `restoreSavedCaseDocuments` accepts legacy `{label,text}` entries with no role on non-reserved documents. In a controlled reanalysis fixture, pass a restored receipt containing `USD 40` through `runPipeline`; assert the receipt is in `workspaceRecords`, `factEvidence.amount.documentId` retains its ID, a prior reply stays company-attributed, and `facts.amount` is `40` rather than `null`.

- [ ] **Step 2: Run the focused tests and confirm the regressions fail**

  Run: `npx tsc -p tests/tsconfig.json && node --test --experimental-test-isolation=none .test-build/tests/saved-cases.test.js .test-build/tests/pipeline.test.js`.
  Expected: the new assertions fail because saved document types discard IDs/roles and the route omits `workspaceRecords`.

- [ ] **Step 3: Persist and restore explicit document metadata**

  Update save validation to require IDs and validate the allowed roles for new writes; identify primary and current-reply documents by role for new saves and by reserved labels for legacy reads. In `FighterApp.saveCase`, retain workspace IDs and roles for attachments and additional documents, map record/reply roles explicitly, and assign `primary-document` and `company-response` IDs to text fields when needed. Use `restoreSavedCaseDocuments` in the reanalysis route and pass `companyResponseSource` to `runPipeline`. Preserve current-reply ID/label in `extractCompanyClaims`. For legacy rows, map reserved primary and company-response labels to their established pipeline inputs, synthesize deterministic IDs only for processing, and leave other roles absent; do not represent those unknown roles as customer or company provenance.

- [ ] **Step 4: Run focused regressions**

  Run: `npm test`.
  Expected: the receipt retains its amount and source identity, a previous reply remains company-attributed, and legacy untyped documents remain un-attributed.

- [ ] **Step 5: Commit the task**

  ```bash
  git add -p src/lib/saved-cases.ts src/components/FighterApp.tsx src/app/api/cases/[caseId]/reanalyze/route.ts src/lib/pipeline.ts src/lib/claims.ts tests/saved-cases.test.ts tests/pipeline.test.ts
  git diff --cached
  git commit -m "fix: preserve saved case document roles"
  ```

## Task 2: Make same-event conflicts compare event type and amount

**GitHub issue:** [#41](https://github.com/R-Hruthvik/fine-print-fighter/issues/41)

**Files:**
- Modify: `src/lib/claims.ts`
- Test: `tests/claims.test.ts`

**Interfaces:**
- Keep `findSameEventConflict(claimA: Claim, claimB: Claim): ValidatedConflict | null` unchanged.
- Add parsing helpers and optional source context to claim extraction, backed by retained documents keyed by document ID. Modify `src/lib/pipeline.ts` to supply that registry. Optional context must remain compatible with older saved claims; keep the conflict schema compatible.

- [ ] **Step 1: Add failing tests for the reported pairs**

  In `tests/claims.test.ts`, assert a conflict is found for same-date, same-currency, same-reference claims `“On 2026-10-08 the disputed charge was USD 40, transaction reference TX-1842”` and `“On 2026-10-08 the disputed charge was USD 400, transaction reference TX-1842”`. Assert no conflict for `“USD 40 charged on 2026-10-08, transaction reference TX-1842”` versus `“USD 400 refunded on 2026-10-08, transaction reference TX-1842”`. Assert no validated conflict for two same-date USD charges with different explicit references (`TX-1842` and `TX-1843`), or when the event reference is missing. In the scalar-fact case, assert the validated conflict retains the original `documentId`, `documentLabel`, and exact evidence excerpt on each claim.

- [ ] **Step 2: Run the focused conflict tests and confirm they fail**

  Run: `npx tsc -p tests/tsconfig.json && node --test --experimental-test-isolation=none .test-build/tests/claims.test.js`.
  Expected: the existing first-number comparison misses the date-first 40/400 conflict and can treat a different-reference charge/refund pair as a conflict.

- [ ] **Step 3: Compare normalized event kinds and monetary values**

  In `findSameEventConflict`, require the same explicit transaction/reference token, date, canonical event kind, and currency before comparing amounts. Parse money independently of date position. A scalar evidence excerpt may contain only `40`; do not assume it contains the event anchors. Pass retained source documents from the pipeline into claim extraction and retain an optional verbatim sentence containing the exact evidence occurrence. If that occurrence is ambiguous or lacks anchors, leave the claim unmatched. Never combine independent facts into an invented event. Return a conflict only when this shared context supports differing amounts. Preserve each claim's original document ID, label, and exact excerpt. Add regressions for scalar-only evidence with and without an unambiguous source sentence.

- [ ] **Step 4: Run conflict and pipeline regressions**

  Run: `npm test`.
  Expected: the 40/400 same-charge case is reported and the same-date charge/refund case is omitted.

- [ ] **Step 5: Commit the task**

  ```bash
  git diff -- src/lib/claims.ts src/lib/pipeline.ts tests/claims.test.ts
  git add -p src/lib/claims.ts src/lib/pipeline.ts tests/claims.test.ts
  git diff --cached
  git commit -m "fix: compare same-event claims safely"
  ```

## Task 3: Render the brief returned by the pipeline

**GitHub issue:** [#40](https://github.com/R-Hruthvik/fine-print-fighter/issues/40)

**Files:**
- Modify: `src/components/CaseResult.tsx`

**Interfaces:**
- Keep the optional `brief?: Brief` prop for callers that explicitly supply a brief.
- Resolve the displayed brief inline as `brief ?? result.brief`; no pipeline schema change is needed because `PipelineResult.brief` already exists.

- [ ] **Step 1: Add a failing regression for result-only rendering**

  Use the existing fictional sample in the rendered workspace with no `brief` prop supplied. Assert the rendered `#claim-comparison-heading` is absent before the fix while `result.brief` is present. This must exercise the rendered component/browser, not a mirrored selector helper.

- [ ] **Step 2: Run the focused test and confirm it fails**

  Run the app with its configured analysis providers and use the browser harness to load the fictional sample. Assert `document.querySelector("#claim-comparison-heading")` is present after analysis, with the component called without an explicit `brief` prop.
  Expected: current result-only rendering omits the heading; after the fix it renders the comparison from `result.brief`.

- [ ] **Step 3: Use the pipeline brief as the default**

  Derive `const displayedBrief = brief ?? result.brief` and use it throughout the comparison section in `CaseResult`.

- [ ] **Step 4: Run the focused test and verify the comparison is available**

  Repeat the browser assertion with the result-only workspace flow. Also verify an explicit brief override takes precedence and an older saved result without a brief does not crash.
  Expected: the heading and comparison content appear from `result.brief`; the existing explicit-prop path still takes precedence because the implementation uses nullish fallback.

- [ ] **Step 5: Commit the task**

  ```bash
  git add -p src/components/CaseResult.tsx
  git diff --cached
  git commit -m "fix: show pipeline case brief"
  ```

## Task 4: Use an extracted company name when the field is blank

**GitHub issue:** [#42](https://github.com/R-Hruthvik/fine-print-fighter/issues/42)

**Files:**
- Modify: `src/components/FighterApp.tsx`
- Modify: `src/lib/saved-cases.ts`
- Test: `tests/saved-cases.test.ts`

**Interfaces:**
- Preserve `FormState.companyName: string` and the existing `SaveCaseInput.companyName: string`.
- Export `resolveSavedCompanyName(userEntered: string, extracted: unknown): string` from `src/lib/saved-cases.ts`; it returns the non-sentinel user value first, then a non-sentinel extracted string, and otherwise `"Unlisted company"`. Treat blank, `unknown`, `not stated`, `not supplied`, `unspecified`, `n/a`, `none`, and `null` case-insensitively as sentinels.

- [ ] **Step 1: Add failing precedence tests**

  In `tests/saved-cases.test.ts`, assert an empty user field resolves to extracted `facts.company`, a non-empty user-entered name is preserved, and blank or sentinel values resolve to `Unlisted company`.

- [ ] **Step 2: Run the focused test and confirm it fails**

  Run: `npx tsc -p tests/tsconfig.json && node --test --experimental-test-isolation=none .test-build/tests/saved-cases.test.js`.
  Expected: the current flow does not consult extracted facts when the field is blank.

- [ ] **Step 3: Populate and save the company field safely**

  There is currently no rendered editable company input. Add a labelled company-name field to the optional result save panel. Seed it with `result.facts.company` only if blank and the extracted value is not a sentinel; identify the suggestion as document-derived and editable. Use `resolveSavedCompanyName` when building the save input; never replace a user-entered value. Verify correction and save in the rendered flow as well as helper precedence.

- [ ] **Step 4: Run the focused regression**

  Run: `npm test`.
  Expected: extracted company names seed blank forms, explicit names win, and missing names retain the current fallback.

- [ ] **Step 5: Commit the task**

  ```bash
  git add -p src/components/FighterApp.tsx src/lib/saved-cases.ts tests/saved-cases.test.ts
  git diff --cached
  git commit -m "fix: name saved cases from extracted facts"
  ```

## Task 5: Ignore generated worktrees and verify the full flow

**GitHub issue:** [#43](https://github.com/R-Hruthvik/fine-print-fighter/issues/43)

**Files:**
- Modify: `eslint.config.mjs`
- Test: cross-flow regressions added in Tasks 1–4; no new duplicate tests required here

**Interfaces:**
- Keep `npm run lint` as the repository lint entry point.
- Add `.worktrees/**` to `globalIgnores`; `.gitignore` already excludes `.worktrees/`, but ESLint does not inherit Git ignore rules.

- [ ] **Step 1: Add the generated-worktree ignore**

  Add `.worktrees/**` to `globalIgnores` in `eslint.config.mjs`.

- [ ] **Step 2: Run lint and the complete verification set**

  Run, in order: `npx eslint src tests`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
  Expected: all commands pass; the full lint run does not inspect generated JavaScript under `.worktrees/`.

- [ ] **Step 3: Review the saved-case flow as one path**

  Confirm a new analysis with an explicit receipt and previous company reply saves and reanalyzes with the original IDs and roles, retains the extracted amount and attribution, displays the comparison brief, uses the extracted company only when the user field is blank, and detects amount conflicts only with matching event references, dates, kinds, and currencies. Confirm an existing legacy JSONB case still opens and unknown roles remain unknown.

- [ ] **Step 4: Commit the task**

  ```bash
  git diff -- eslint.config.mjs
  git add eslint.config.mjs
  git commit -m "chore: ignore generated worktrees in eslint"
  ```

## UI/UX audit — 2026-11-02

### Scope and evidence

Used Impeccable's audit workflow and detector, source inspection, and browser-harness with local Chromium. Two Luna agents reviewed UX and technical UI evidence; a third drafted the plan. The UX agent completed its report. The technical and plan agents reached a usage limit; the primary agent completed verification and consolidated this document. Partial agent work is not counted as a completed independent audit.

Reviewed desktop captures at 1536px, narrow viewports at 390px and 320px, intake, result explanation, sign-in, and analysis-progress states. The primary agent also exercised missing-context validation with keyboard input at 320px. Used fictional text; no real customer records or authenticated database writes. Emulated viewports do not establish physical touch behavior.

### Implementation integrity verdict

**Visual system: coherent within scope. Flow completeness: needs remediation.** Paper-like surfaces, editorial type, document imagery, record/reply roles, and source-oriented review sections express a product-specific system. Preserve that direction. The five code findings above and three UX findings below need attention before treating the reviewed flows as release-ready.

The detector returned one warning: `bounce-easing` at `src/components/landing/landing.module.css:483`, on `.hud-stamp` (`cubic-bezier(0.2, 1.4, 0.3, 1)`). This short decorative stamp effect is a design preference, not an observed task failure or release blocker. Reduced-motion landing styles provide settled alternatives; no motion failure was established.

### Audit health snapshot

Scores are provisional assessments of the inspected implementation, not accessibility certification.

| Dimension | Score | Evidence and limits |
|---|---:|---|
| Accessibility | 2/4 | Labelled controls and visible keyboard focus; required fields appear after submission without receiving focus. No full assistive-technology test. |
| Performance | Not scored | Development rendering and build success do not establish production speed. No Lighthouse, bundle analysis, frame trace, or Core Web Vitals measurement. |
| Responsive design | 3/4 | Intake fits 320px without horizontal page overflow; main buttons are 44–49px tall. Review choices wrap unevenly at 390px. Touch and text zoom untested. |
| Theming | 3/4 | Shared paper/ink/accent tokens, intentional light theme, some local decorative colors. Full contrast inventory untested. Dark mode is not a stated requirement. |
| Implementation integrity | 2/4 | Coherent visual direction; hidden prerequisites and missing comparison undermine flow completeness. Detector warning is nonblocking. |
| Total | Not calculated | A /20 total would imply performance evidence that was not collected. |

### Additional UX backlog

Three P2 findings and one P3 refinement follow. These are recorded here, not published as additional issues. No new P0/P1 UX finding was established in this limited audit; the five functional findings are tracked above.

#### UX-1 — [P2] Required context appears after the first failed submission

- **Location:** `src/components/FighterApp.tsx:102`, `:136–140`, `:320`.
- **Category:** Accessibility / interaction flow.
- **Evidence:** `showQuestions` starts false. After fictional text was entered and submitted with the keyboard, two required selects appeared, an alert explained the missing context, and focus remained on “Review my case.” The 320px page had no horizontal overflow before or after this transition.
- **Impact:** An apparent final action unexpectedly stops and expands the form. Keyboard users must locate the newly inserted controls.
- **Plan:** Show location and issue type before final submission, or make this a clearly labelled “Continue” step that reveals context and moves focus to its heading or first field. Do not describe an expected step as a failed review.
- **Acceptance:** Required context is discoverable before final submission. Keyboard focus moves predictably; field-specific feedback identifies and is associated with the relevant control. Confirm at 320px and desktop.
- **Related:** #33 staged intake; #38 accessibility review.

#### UX-2 — [P2] Saving unexpectedly requires a company reply

- **Location:** `src/components/FighterApp.tsx:251–252`, `:291–295`.
- **Category:** Interaction flow / recovery.
- **Evidence:** Intake accepts a case without a reply. The save panel promises to save documents, analysis, and draft, but `saveCase()` refuses an empty current reply. Source-confirmed; authenticated persistence was not exercised.
- **Impact:** A user can finish the advertised entry path and then discover that saving their work is unavailable, with a message to keep the page open.
- **Plan:** Prefer saving a valid draft without a reply. If the product/backend contract requires one, disclose that constraint before the save action and provide a direct “Add company reply” recovery action preserving current work. Decide this contract explicitly before implementation.
- **Acceptance:** A no-reply case either saves and reloads safely, or the requirement is visible before clicking Save with a usable recovery action. Verify sign-in handoff and pending-save expiry without losing entered material.
- **Related:** #36 saved cases and #39 typed persistence; coordinate with Task 1.

#### UX-3 — [P2] Provider notice follows the submit action

- **Location:** `src/components/FighterApp.tsx:324–325`.
- **Category:** Content hierarchy / informed choice.
- **Evidence:** The provider-processing disclosure follows submission controls in DOM and visual order; captures place it below the main action and partly outside the initial viewport.
- **Impact:** Users can reach the action that sends dispute material before seeing where it is processed.
- **Plan:** Put concise processing text immediately above or beside final submission. Preserve the useful statements that guest cases are not saved and nothing is sent to the company. Match wording to configured provider behavior.
- **Acceptance:** At 320px, 390px, and desktop, the notice precedes submission in reading order, remains legible, and is available without opening an unrelated disclosure.

#### UX-4 — [P3] One review choice wraps onto a separate row

- **Location:** `src/app/globals.css:813–815`; 390px review capture.
- **Category:** Responsive design / hierarchy.
- **Evidence:** “Evidence record” sits beneath the other three review choices. No inaccessible control, horizontal overflow, or broken touch interaction was established.
- **Plan:** Consider a deliberate two-column arrangement on narrow screens, preserving labels and active state. This is optional polish.
- **Acceptance:** All four choices remain discoverable, keyboard reachable, comfortably sized, and clearly selected at 320px and 390px.

### Strengths to preserve

- Distinct customer records and company replies, with explicit document-role controls.
- Visible uncertainty and clear separation of extracted material, company claims, and AI interpretation.
- Explicit guest/save handling and a review-and-confirm handoff after sign-in.
- Warm editorial visual language, native labelled controls, visible focus outlines, and mobile-sized main buttons.

### Sequence and outstanding verification

1. Complete the five issue-linked tasks above, prioritizing #39 evidence preservation and #41 false/missed conflicts.
2. Resolve UX-2 with the save contract. Address UX-1 and UX-3 in the next intake pass; keep UX-4 optional.
3. After #43, run `npm run verify`, then browser-check supported record-only/reply-only/combined cases, reanalysis, legacy data, and sign-in recovery. Use fictional fixtures and controlled provider responses for repeatable regressions.
4. Before release, complete screen-reader/keyboard coverage across all result views, physical or synthesized touch checks, 200% text zoom, contrast measurement, and production performance profiling.

**Existing baseline, not fixes:** The review observed 128 passing tests, passing typecheck, production build, and source-scoped ESLint. `npm run verify` failed because lint traversed generated nested worktrees (#43). Those checks preceded this documentation-only consolidation. None of the reported defects is claimed fixed.

### Runtime advisories

The development-server log also reported Next Image warnings for `/images/fine-print-engraving.jpg`: one dimension modified without the other, and an above-fold LCP candidate without eager loading. These are diagnostic advisories, not measured layout shift or slow LCP. Inspect the rendered aspect ratio and production waterfall before choosing a sizing/loading change. No performance score is inferred from these warnings.

### Evidence artifacts and limits

Session artifacts below are temporary and may be removed by the system; they are not durable repository assets:

- `/tmp/fpf-tech-landing-1536.png`
- `/tmp/fpf-tech-intake-desktop.png`
- `/tmp/fpf-tech-intake-390.png`
- `/tmp/fpf-tech-intake-320.png`
- `/tmp/fpf-tech-signin-desktop.png`
- `/tmp/fpf-tech-context-prompt.png`
- `/tmp/fpf-tech-analysis-progress.png`
- `/tmp/fpf-review-desktop.png`
- `/tmp/fpf-review-mobile.png`
- `/tmp/fpf-impeccable-detector.json` — one nonblocking warning.

Real assistive technology, physical device gestures, authenticated database writes, every empty/error state, production performance, and a full contrast inventory remain unverified. These are pending checks, not assumed passes or newly confirmed defects.


## Current-main implementation triage

Execution worktree: `.worktrees/codex-review-remediation`, based on remote `main` at `327cf18`. The original dirty checkout is preserved. Baseline: 96 passing tests.

- **#39:** Still valid, but the current pipeline has no workspace extractor. Preserve explicit IDs/roles in new saved documents; restore legacy extras without guessed attribution. Add supporting-record extraction only for explicit record roles; preserve primary values when sources disagree and retain supporting provenance.
- **#40:** Not applicable to current main: `claims.ts`, `PipelineResult.brief`, and the comparison section are absent. Do not resurrect the local-only feature to fix a missing prop. Record the issue disposition against the current guided result UI.
- **#41:** Repair the equivalent live defect in `llm.ts:localAmountConflicts`. Require source-backed shared event reference/date/kind/currency and unambiguous typed amounts. Keep the existing validated cancellation-date path and model-conflict demotion.
- **#42:** Current main already has an editable intake company field. Preserve that field and explicit user values; resolve blank values from usable extracted facts and allow review/correction before saving.
- **#43:** Ignore generated nested worktree content in ESLint and Git.
- **UX-1:** Staged context supersedes the old validation failure. Check and repair focus when stages replace controls.
- **UX-2:** Permit first-complaint saves without a reply; omit empty reply documents. The analysis pipeline already accepts an empty reply.
- **UX-3:** Disclosure precedes final submission, but `/api/prepare` also sends text to a provider at Step 2. Put disclosure before that first provider-bound action too.
- **UX-4:** Verify and use a deliberate narrow-screen arrangement for the four review choices.

Each cohesive fix receives its own commit, verification, review, push, and merge to main. Automated tests and browser evidence must target the current implementation, not obsolete local interfaces. Model used for fresh implementers/reviewers: Luna, as requested.
