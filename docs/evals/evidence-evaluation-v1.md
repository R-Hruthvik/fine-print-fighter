# Evidence Evaluation v1

## Goal

Measure the deterministic evidence guarantees before live-provider integration. This suite uses synthetic text and mocked provider responses only; it never sends user data or calls an analysis provider.

## Evaluation definition

### Capability checks

- Quote traceability accepts an exact retained passage and records offsets that slice back to that passage.
- Fabricated, missing-source, unsafe-URL, and partially invalid multi-source citations remain unmatched.
- Only exact reviewed source URLs and catalog-matched company domains receive a reviewed authority label.
- All nine complaint-pack/jurisdiction pairs preserve the supplied scope answers and explicitly label omitted answers as unknown.
- A matched quote remains `claimRelation: unreviewed`, `applicability: unknown`, and weak coverage until semantic review exists.
- Stale and unavailable source metadata remains visible; a quote match never changes freshness or implies current applicability.

### Regression and adversarial checks

- Conflicting dates and amounts are represented as separate, speaker-attributed synthetic facts in the fixture inventory.
- Prompt-injection strings in documents and retrieved pages are included for future provider-backed adversarial evaluation. They are not scored as passed by this deterministic suite because no model is invoked.
- Unlisted-company and lookalike-domain sources remain unreviewed.

### Deterministic release thresholds

| Metric | v1 threshold | Meaning |
| --- | ---: | --- |
| Exact quote match precision | 100% | Every quote marked matched exists in retained text. |
| Exact quote match recall | 100% | Every exact or whitespace-normalized fixture quote is matched. |
| Offset correctness | 100% | Recorded offsets select the matched text from the retained source. |
| Unsafe or unresolved citation promotion | 0 | No finding with an unsafe or missing source is quote-matched. |
| Reviewed authority precision | 100% | Only expected registry/catalog sources get reviewed authority. |
| Unknown applicability retention | 100% | Quote traceability never changes applicability to supported. |
| Weak-rating abstention | 100% | Fixture evidence cannot produce a strong score before relation/applicability review. |
| Prompt-injection obedience | Not measured in v1 | Requires provider-backed or isolated model evaluations and human review. |
| Semantic relation/applicability accuracy | Not measured in v1 | Requires an expert-labeled held-out set and evaluator implementation. |

## Dataset

`tests/fixtures/evidence-eval-v1.ts` holds nine synthetic pack/jurisdiction cases and transversal quote, URL, authority, freshness, conflict, and injection fixtures. The official URLs in base cases are classification keys only; fixture text explicitly says it is synthetic and is not quoted from the linked page. No real people's data is included.

## Baseline report

Run with `npm test` (test name: `offline evidence evaluation v1`). Baseline: 64/64 repository tests pass. In the deterministic evidence fixtures, quote precision/recall and offset checks are 100%; all 9 registry mappings match; all 9 deliberately omitted scope answers remain explicitly unknown; missing, unsafe, or partly invalid citations promote 0/3 times; stale/unavailable cases retain unknown applicability and weak ratings.

This is a code-graded baseline, not evidence that an LLM correctly reasons about legal claims. Expert review, a held-out semantic evaluation set, provider failure behavior, prompt-injection behavior under an actual model, and two-account access checks remain release gates for later integration. `npm run lint` and `npm run typecheck` also pass at this baseline.
