# Fictional customer live-run preflight — 2026-10-28

Status: blocked at model configuration, not a completed analysis journey.

Scenario: fictional Alex Morgan, Netflix US direct-billed subscription, unsuccessful October 8 cancellation attempt, USD 15.99 October 10 charge. Fixtures are under `fictional-packet/`; no genuine customer information is used.

Configuration presence check using Next environment loader found no Nebius key, compatible endpoint/model/key, Tavily key or Supabase URL in this execution environment. The application defaults to Nebius model `nvidia/Nemotron-3_5-Lightning`.

Actual running-server preflight: valid POST /api/extract with customer document, company response, pack subscription-cancel and country US returned HTTP 503, code CONFIGURATION_MISSING, retryable false: “Analysis is not configured. Set the Nebius API key on the server.” See model-preflight.json. No successful model inference is claimed. An earlier incomplete probe without companyResponse returned 400 validation error, then was corrected.

Browser Harness opened and captured homepage and initial intake. Intake screenshot was visually inspected. Additional case-details/documents screenshots were requested during the browser run. Only files actually present under screenshots are evidence of completed captures.

Next: configure NEBIUS_API_KEY securely on the app server (and restart if necessary), confirm intended NEMOTRON_MODEL, then repeat preflight and continue customer journey. Tavily API key is needed for predictable authenticated search/page extraction; account-backed save tests require Supabase configuration. Never post keys into the report or chat.

No results, citations, generated letter, persistence, or reanalysis have been verified in this run. No complaint was sent or filed.

## Router-enabled browser run

Configured local OpenAI-compatible router with `kc/nvidia/nemotron-3.5-super-vl:free`; direct JSON smoke test and app provider helper test passed. The old missing-key preflight above is historical.

Browser journey entered Netflix, US, signup 2026-09-10, cancellation request 2026-10-08, direct billing and company website. Combined customer record/receipt/transcript: 1,802 characters; separate company reply: 374 characters. Review screen confirmed all selections and four scope answers. No later confirmation was included. Screenshots 05 through 09 capture documents, review, investigation and timeout/retry state; error screenshot was visually inspected.

First actual UI analysis failed with “The analysis provider timed out” (reference f6e9d687-f62f-4ba7-995a-5062030ed9d3). Review summary remained populated; the customer could retry without re-entering the packet. One retry was submitted. No successful result, citation audit, export, saved-case flow or reanalysis is claimed. A small JSON smoke test does not prove the larger extraction/investigation request meets the application's provider deadline. Diagnose model latency/timeout behavior before further live runs.

Retry outcome: extraction completed (UI reported 38.4s), query planning completed (0.0s), and public research began; then the investigation model timed out (reference 603c3640-be09-4013-b162-6a64344c22af). Screenshot 10 captures the final failure. Stopped after two live UI submissions; no third retry. Next engineering task is to diagnose the investigation model's full-request latency and the per-turn timeout, rather than repeatedly retrying the customer journey.

## Timeout diagnosis and mitigation

Provider JSON and tool turns both used a fixed 25-second timeout. Router smoke testing explicitly disabled reasoning; app requests did not. Added opt-in `LLM_REASONING_ENABLED=false` for gateways supporting the reasoning field, applied consistently to both JSON and tool calls. A live full-pipeline retest still timed out on extraction after 51.3s (two bounded attempts), so reasoning was not established as the sole cause.

A diagnostic extraction with the same synthetic record, app prompt/schema and a longer transport observation window returned valid facts in 2.444 seconds (HTTP 200). This demonstrates variable upstream latency, not a deterministically broken extraction schema. Added bounded `LLM_TURN_TIMEOUT_MS` (1000–60000; default 25000), configured 60000 locally. The parent 120000ms pipeline signal still takes precedence. This is a mitigation; end-to-end completion is not yet established. No router source changes made.

## Bounded fix/commit/rerun cycles

- Commit 1484c27: optional reasoning opt-out and bounded per-turn timeout configuration; prior verification passed.
- Cycle 1: live endpoint failed after 71.709s with INVALID_MODEL_RESPONSE. Saved cycle-1-result.json.
- Cycle 2: streamed live endpoint completed in 51.866s with 14 sources and 10 findings. Inspection found the four-action investigation limit stopped the loop before a structured finish turn.
- Regression: four source inspections followed by a grounded finish call failed before the fix. After reserving a completion-only turn, all 87 tests, lint, TypeScript and build passed.
- Commit 4fe9af6: reserve investigation completion after source inspection budget.
- Cycle 3: full streamed live endpoint completed again, with 14 sources and 13 findings. Event/result records retained in cycle-3-events.ndjson. No mock output used.

These cycles tested the real analysis endpoint. They do not establish account-backed saving, browser export correctness, or human-reviewed claim applicability. Full-page extraction remains unavailable without a Tavily key; results disclose limited coverage. UI/theme changes from the earlier task remain uncommitted and were not swept into these focused backend commits.
