# Guided review implementation

The complaint workspace now separates first complaints from company-reply reviews. The new `/api/prepare` endpoint performs bounded fact extraction before research, using existing validation and production/shared-budget protection. Users check extracted statements and can return to clarify their original record before confirming. Corrections are made in the record rather than silently replacing evidence with model-generated assertions.

The analysis response adds an optional conservative `reviewSummary`: conflicts take priority, unresolved questions are deduplicated and bounded, and no refund entitlement is inferred. Older results derive this summary locally. Results open on a next-step view; supporting review, draft, and the full evidence record have explicit navigation. Source links open the evidence view. The source column no longer runs beside the entire result. Saving and activity are secondary disclosures. The intake no longer includes a competing offline demo.

Limits: this is the initial guided-flow implementation. It does not add server-side resumable jobs, persisted guest checkpoints, stage caching, or claim-level incremental reanalysis. Preparation and full analysis currently extract independently; the latter revalidates the actual submitted record. Authenticated saved-case detail pages retain their existing layout. Human-reviewed applicability and source freshness remain unresolved by this presentation change.

Research used: frontend-learn archive constraint layout, typography, focus, motion and accessibility curriculum; Impeccable Operate guidance; React Best Practices; Browser Harness. Browser check at 390px confirmed no overflow, both intent selection and removal of the offline demo. Full backend live-journey verification remains a separate run.

## Readability and follow-up pass

Raised small text declarations to a 14px floor and task prose/form inputs to 16px; browser measured body/input text at 16px and no page overflow at 1440/900/390/320px. Adjusted mobile header layout after inspecting 320px screenshot. Applied frontend-learn typography/constraint-layout/focus guidance from `/home/hruthvik9487/Documents/frontend/distilled/03_typography.md`, `02_constraint_layout.md`, and `02_focus_indicators.md`.

Added an unconditional follow-up evidence entry point within Why this, with the existing exhibit limits and recheck controls. Summary is hidden when another view is selected; view navigation moves focus to the relevant heading. Supporting notes use native disclosure controls. New fact labels distinguish reported charges after a cancellation request from completed cancellation. Removed the unsafe date-proximity conflict heuristic; the evaluator is instructed to compare the same event and treat compatible attempt/account-active statements as uncertainty. Model compliance still requires live evaluation; prompting alone is not proof of semantic correctness.
