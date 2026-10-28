# Output clarity and truth-status review

Live source audit confirms three Tavily search queries (jurisdiction rules, company policy, similar complaints), deduplicated retained search snippets, and bounded model tools for further inspection/research. Model itself does not browse arbitrary pages. No Tavily key is configured, so full-page extraction is skipped. Existing source/claim status already restricts applicability; the customer summary now explicitly distinguishes snippets-only research from page retrieval.

Fixes: model conflict strings are described as automated questions, not confirmed contradictions; summaries recompute for old saved result shapes; matched/unmatched quotations use neutral explanatory labels instead of a success color; long snippets are disclosures; two initial questions keep the next-step screen focused; status details disclose document provenance, research coverage and limits of advice; quote truncation in additional exhibits uses a word boundary and explicit omission marker. Compact result spacing reduces mobile overhead.

Measured text/background contrast: ink/paper 15.53:1, muted/paper 6.97:1, accent/light paper 5.10:1, evidence links/paper 6.98:1. These are specific palette pairs, not a blanket WCAG certification. Browser confirmed 16px body and no 390px page overflow; desktop/mobile screenshots inspected.

Live follow-up retest completed in 82.429s with real keyless search. Model STILL called compatible attempt/account-active statements incompatible; hypotheses about account restart also remain hypotheses, not established events. Advice correctness is NOT certified. Current safe output is a clarification request with explicit uncertainty. Structured conflict pairs with exact document references and an event-identity validation gate remain necessary before asserting actual contradiction. Full-page freshness/applicability review also remains necessary before actionable legal advice.

Full verify passed 93 tests, lint, TypeScript and build before final CSS spacing adjustment. Skills applied: frontend-learn typography/constraint layout/focus guidance, Impeccable inspection, Systematic Debugging, TDD and Verification Before Completion. No new legal eligibility or remedy claim was added.

## Structured conflict gate — implemented

Model free-text conflicts no longer enter the validated conflict list; they remain labeled unvalidated interpretations. `conflict-check.ts` admits only exact quotes from two distinct registered documents asserting different ISO effective-cancellation dates using explicit effective-date/termination wording. Attempt dates and account-active dates fail closed. Other formats/events remain unverified rather than guessed at; quote matching still does not establish document truth. Existing amount-difference warnings remain separate deterministic review flags.

The evaluator requests labeled conflict pairs and retains supplied follow-up context. Regression cases cover incompatible effective dates, compatible attempt/active statements, missing/fabricated quotations and same-date pairs. Existing pipeline assertions now verify ungrounded conflict strings stay unverified.

Real follow-up retest completed in 40.215s, with no validated conflicts, a document-provided match for the cancellation confirmation, and Prepare my reply as the next action. This does not verify legal entitlement or full-page policy freshness. Full verification passes 96 tests, lint, TypeScript and production build. Live output retained at audit/live-customer/followup-conflict-gate-retest.ndjson.
