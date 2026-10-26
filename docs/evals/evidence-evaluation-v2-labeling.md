# Evidence Evaluation v2: Labeling Rubric

## Purpose and status

This defines a candidate holdout set for checking whether an evidence passage relates to a narrow claim, separately from whether the source applies to a person's situation. Candidate rows are synthetic and cite official source pages. Proposed labels are hypotheses for reviewers, not legal advice or approved ground truth. Every row remains `pending_expert_review` until two independent reviewers with relevant consumer-law and jurisdiction expertise label it and disagreements are adjudicated.

Do not use these examples to tune prompts and then report the same examples as held-out evaluation. Once reviewed, split a small development set from the sealed holdout and record the split in the dataset manifest.

## Label two separate questions

### Passage-to-claim relation

Judge only the words in the retained passage against one atomic, attributed claim:

| Label | Use when |
| --- | --- |
| `supports` | The passage directly supports the narrow proposition as written, with no omitted condition that changes its meaning. |
| `opposes` | The passage directly contradicts the proposition as written. |
| `qualifies` | The passage is relevant but adds a condition, exception, limitation, date, actor, service, route, or scope distinction that narrows the proposition. |
| `mentions` | The passage is about the same topic but does not support or contradict the proposition. |
| `insufficient` | The retained passage is too short, ambiguous, incomplete, or out of context to determine a relation. |

The label does not say whether the source is true, current, binding, or applicable. Record exact passage offsets and the claim speaker/type separately. A synthetic or model-generated statement is not source evidence.

### Scenario applicability

Record applicability as `supported`, `not_established`, or `uncertain`, with reasons and required facts. This is a label about whether the cited material can be applied to the narrow scenario as described; it is never a finding of legal eligibility, liability, entitlement, or likely success.

Use `not_established` when a necessary input is missing (for example route/carrier, Member State/state, service or event date, service sector, enrollment channel, payment partner, or relevant policy version). Use `uncertain` when material is conflicting, the source status/effective period is unclear, or the fact/source cannot be reliably resolved. Only use `supported` when the facts required by the source's stated scope are present and the source text itself supports that limited scope match. A reviewer must explain why; jurisdiction selection alone is not enough.

## Reviewer procedure

1. Review one claim and one retained passage at a time. Do not infer unstated facts from a company name, user residence, or jurisdiction dropdown.
2. Confirm the recorded source page and its publisher/authority. If the page cannot be opened or its exact text does not match the retained excerpt, mark the source `unavailable` or the example `insufficient`; do not reconstruct it from a search snippet.
3. Check quote boundaries, negation, exceptions, date, actors, route/market, covered service, and surrounding context. Mark a passage `qualifies` rather than `supports` if an omitted condition materially narrows the claim.
4. Label passage relation first. Then independently label scenario applicability and list missing facts. Do not let one label determine the other.
5. Preserve contrary statements with their speakers and source IDs as separate rows. Do not resolve factual disputes by majority vote or by preferring an official source without checking what it actually addresses.
6. Two reviewers label independently. A third qualified adjudicator records the final label and a short rationale for disagreements. Preserve both original labels in the dataset.

## Record requirements

Each case records a synthetic scenario, pack/jurisdiction, supplied and deliberately missing facts, source identity and review date, bounded retained passage(s) with offsets and an excerpt SHA-256, and atomic claims linked to the exact passage IDs they assess. Proposed relation/applicability labels, uncertainty reasons, reviewer labels, and adjudication status remain separate. Source URLs are opened and checked before review. Do not include personal data, account identifiers, booking/payment identifiers, or full copyrighted pages. Keep excerpts short and contextual; link to the source for the surrounding text.

## Metrics after adjudication

- Relation macro precision/recall/F1 for `supports`, `opposes`, `qualifies`, `mentions`, and `insufficient`, reported by pack and jurisdiction.
- Applicability confusion matrix and **overclaim rate**: cases labeled `not_established` or `uncertain` that the system calls supported. Release threshold for overclaim is 0 on the reviewed holdout.
- Abstention rate on incomplete or conflicting scope, and correct abstention rate (abstaining when evidence is insufficient or applicability is unresolved).
- Conflict retention: all materially opposing facts remain visible with speaker/source attribution.
- Quote/offset accuracy, source authority correctness, and freshness status remain separate metrics from relation and applicability.
- Report sample counts and reviewer agreement; do not combine relation, applicability, and outcome into one score. Do not use an LLM judge as the release gate.

## Candidate set format

Candidate records use `tests/fixtures/evidence-eval-v2.ts`. The initial set contains one synthetic scenario for each of the 9 pack/jurisdiction pairs and two claim candidates per source: a narrowly scoped claim and an overbroad or unsupported claim. Proposed labels and reviewer fields are visibly marked pending. The source material was opened on 2026-10-26; dated or changing rules still require review against the eventual scenario date. A candidate set is not called an expert-labeled holdout until the review and adjudication steps above are complete.
