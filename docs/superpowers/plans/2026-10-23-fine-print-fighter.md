# Fine Print Fighter implementation plan

**Goal:** Implement the text-case MVP in [the spec](../../spec.md).

**Architecture:** Retain the App Router application and JSON rule packs. Keep provider calls on the server, validate provider responses and requests, and derive evidence status and citations in application code. Keep case data in browser memory.

**Execution:** User authorized implementation and subagents. Evidence/provider and interface work run in parallel; the root agent integrates the contracts, APIs, tests, and release notes. Changes stay in this project directory; no automatic commits or external publishing.

## Constraints

- 30,000 document characters, 256 KiB body limit, six queries, five results per query, three concurrent searches.
- 120-second analysis deadline; one retry/repair at most per model stage.
- No automatic sending, accounts, payments, OCR, or durable case storage.
- Source snippets cannot establish legal applicability on their own. Keep applicability unknown unless independently supported; constrain ratings accordingly.
- Live-provider, jurisdiction, and latency audits require configured credentials and remain separate release gates.

## Tasks

- [x] Evidence engine: add failing tests for unknown IDs, fabricated passages, malformed model output, bounded retries, unsafe URLs, opposing evidence and absent search credentials; implement `provider.ts`, `evidence.ts`, `llm.ts`, `tavily.ts`; run tests.
- [x] Intake and APIs: add failing tests for whitespace/oversized documents, invalid enums and optional types, malformed JSON, oversized streamed requests, raw provider errors and stage route access. Implement `request.ts`, primary route, and development-only stage handling; run tests.
- [x] Packs and orchestration: validate pack registry; require applicability facts, preserve unanswered/conflicting findings, handle no-estimate remedies, cancellation and timings. Add fixture-driven pipeline tests with network substituted only at provider boundaries; run tests.
- [x] Interface: validate text files and form inputs, honest status/cancel, retained input, linked evidence and unknowns, controlled editor, current-text download/print, clear new case. Add behavior helper tests and exercise browser workflow.
- [x] Verify and document: run lint, typecheck, full tests, production build, browser checks; review integration with a fresh agent; fix substantive findings and record remaining release gates.

## Review focus

1. A user-supplied verified flag must never become trusted evidence.
2. Provider payloads and personal information must never appear in public errors or routine logs.
3. Incomplete or failed searches must not yield a strong case.
4. Editing must affect the downloaded and printed letter.
5. Aborted/expired runs must not continue provider requests.
