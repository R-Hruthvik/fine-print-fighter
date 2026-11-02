# Integration correction report

Baseline: `f1ea371` (`124` tests passing).

## Monetary comparison across receipt and company reply

Added deterministic pair comparison for the primary record against existing supporting documents, plus explicitly typed customer records against the current company reply and other customer records. Unknown-role extras retain the prior primary-to-exhibit comparison behavior but do not extend the customer-record comparison set. Same-event anchors, currency parsing, amount comparison, exact quotations, labels, and IDs remain unchanged. Equal IDs are skipped to prevent self-comparison, and each supported pair is visited once.

RED: `npm test -- --test-name-pattern='customer-record receipt|receipt comparisons fail|eligible unordered source pair'` compiled tests and returned `125` passing, `2` failing. The receipt-versus-reply disagreement and distinct receipt/reply pairs both returned no conflicts.

GREEN: after the pairing change, the same command returned `127` passing, `0` failing; the later anchor-negative boundary test also passed (`128` passing, `0` failing).

Commit: `1abcead Compare explicit customer receipts against company replies`.

## Request role type contract

Required `role` to be a string before checking the whitelist. Added rejection coverage for array, null, object, and numeric roles; omitted roles still normalize to `unknown`.

RED: after adding the regression cases, `npm test -- --test-name-pattern='additional document roles accept only explicit values'` returned `127` passing, `1` failing because the array role passed validation.

GREEN: `npm run typecheck` succeeded; `npm test` returned `128` passing, `0` failing; `npm run lint` succeeded.

Commit: `9e66fac Require string evidence roles in case requests`.

No provider calls, UI changes, or save-helper changes were made.
