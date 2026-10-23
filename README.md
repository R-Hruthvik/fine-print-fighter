# Fine Print Fighter

Turn a bill, notice, or company email into an evidence file, an editable complaint letter, and escalation options. Paste text or upload a UTF-8 `.txt`/`.md` document, select a dispute type and research jurisdiction, then review the sources and missing information before acting.

This is an information tool, not legal advice. You review and send the letter yourself.

See the [project specification](docs/spec.md), [implementation plan](docs/superpowers/plans/2026-10-23-fine-print-fighter.md), and [implementation status](docs/implementation.md).

## Run locally

Requires Node.js 22 and npm.

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Set `NEBIUS_API_KEY` and `TAVILY_API_KEY` in `.env.local`. Set `NEMOTRON_MODEL` to a model available to your Nebius account. Open the local URL printed by Next.js (normally http://localhost:3000). The interface works without credentials; submitting a case shows a configuration message until the keys are set.

## What is implemented

- Three dispute packs: flight delay/cancellation, subscription cancellation, and surprise billing.
- India, European Union, and United States as initial research scopes, with unresolved applicability questions shown explicitly.
- Text input up to 30,000 characters and uploads/requests up to 256 KiB.
- Grounded extraction, minimized queries, deduplicated research, passage checks, conservative evidence ratings, and visible conflicts and unanswered questions.
- Deterministic English complaint letters that quote matching research passages and ask the company to confirm applicability. Citation records come from the application source registry.
- Editable letters with current-text download and print/PDF export, cancellation, and clear-case controls.
- Runtime request/provider validation, bounded model retries, per-call timeouts, a 120-second analysis deadline, and safe public errors.

A matching passage proves traceability, not legal applicability or entitlement. Current applicability remains unreviewed, so the application cannot give a strong rating. Escalation entries are unreviewed pack suggestions, clearly labeled for verification. It does not calculate compensation entitlements; a documented disputed charge is shown only when its numeric value and currency are explicit.

The under-90-second goal has not been benchmarked. Live-provider and jurisdiction audits remain release gates.

## Architecture

Next.js 16 App Router, React, TypeScript, and custom responsive CSS. Nebius Token Factory supplies the configured NVIDIA Nemotron model; Tavily supplies research results. No application database or saved case history.

The server pipeline extracts facts, builds queries from pack templates, researches, evaluates and checks passages, constrains the evidence rating, describes the requested remedy, constructs the letter, and returns escalation suggestions. Only extraction and evaluation use the model; query planning, scoring, letter construction, and escalation are controlled in application code.

## Configuration

| Variable | Purpose |
| --- | --- |
| `NEBIUS_API_KEY` | Server-side model key, required for analysis |
| `NEBIUS_BASE_URL` | OpenAI-compatible endpoint; default `https://api.nebius.ai/v1` |
| `NEMOTRON_MODEL` | Model identifier available to your account; verify availability before deployment |
| `TAVILY_API_KEY` | Server-side research key, required for analysis |
| `ENABLE_STAGE_ROUTES` | Optional `true` enables development-only stage routes; always unavailable in production |

Case content stays in browser memory and transient server requests. The model receives document text; Tavily receives minimized queries. Routine application logs contain timing and counts, not case text. Provider and hosting retention policies still apply.

The app has a process-local budget of 12 analyses per minute and at most three concurrent analyses. Before a public multi-instance deployment, enforce a shared request budget at the hosting boundary and verify the host supports 120-second requests.

## HTTP interface

`POST /api/extract` runs the full pipeline. Required JSON fields: `documentText`, `packId`, `country` (`IN`, `EU`, `US`). Optional fields: `userName`, `desiredOutcome`, `language`, `replyDeadline`. Letters currently use the English template; another requested language returns an explicit warning.

Errors contain `error`, `code`, `retryable`, and `requestId`. Responses use `Cache-Control: no-store`. Invalid input returns 400/413, budget limits 429, unavailable configuration 503, upstream failure 502, and timeout 504.

The `/api/plan`, `/api/research`, `/api/evaluate`, `/api/score`, `/api/draft`, and `/api/escalate` routes are disabled by default. When enabled in development, pack-dependent stages take `packId` rather than client-authored prompts. Score and draft requests require `sources` and recheck references and passages; client-supplied verification flags are never trusted. See `src/lib/stage-api.ts` for their development contracts.

## Add a rule pack

1. Create JSON in `src/rule-packs/` using an existing pack's schema, version, required facts, and review metadata.
2. Import it and add it to `registerPacks(...)` in `src/lib/packs.ts`. The case selector derives from the registry.
3. Review jurisdiction applicability and escalation provenance before describing the pack as verified. Specialized compensation formulas need reviewed calculation code and regression tests.

## Verification

```bash
npm run verify
```

This runs ESLint, TypeScript checking, the complete regression suite, and a production build. Tests compile to ignored `.test-build/` output and substitute provider HTTP responses with controlled fixtures; they do not make paid requests.

## Remaining scope

PDF/image OCR, accounts, payments, persistence, automatic sending, multilingual templates, independently reviewed applicability, sourced procedural escalation, and compensation formulas are not implemented. Live-provider accuracy, retention configuration, jurisdiction coverage, and latency need review before public release.
