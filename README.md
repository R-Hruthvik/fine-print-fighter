# Fine Print Fighter

Fine Print Fighter’s Rebuttal Lab stress-tests a consumer dispute against the company’s actual written response. It researches bounded policy questions, shows only objection passages it can match to retained sources, asks for a specific missing document, and re-runs the analysis when that evidence is supplied. It also creates an editable, cited response letter.

This is an information tool, not legal advice. You review and send the letter yourself.

See the [project specification](docs/spec.md), [implementation plan](docs/superpowers/plans/2026-10-23-fine-print-fighter.md), and [implementation status](docs/implementation.md).
Current submission planning: [hackathon readiness research](docs/research/2026-10-24-hackathon-readiness.md) and the [Rebuttal Lab demo storyboard](docs/demo/rebuttal-lab-storyboard.md). The storyboard is a plan, not a recorded or provider-verified demo.

See the [deployment guide](docs/deployment.md) for Node/Vercel setup, server secrets, request limits, and judge access.

## Run locally

Requires Node.js 22 and npm.

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Set `NEBIUS_API_KEY` in `.env.local`. `TAVILY_API_KEY` is optional: without it, the app uses Tavily's rate-limited keyless access for exploration; set a key for more predictable research quota. Set `NEMOTRON_MODEL` to a model available to your Nebius account. Open the local URL printed by Next.js (normally http://localhost:3000). The interface works without credentials; submitting a case requires the Nebius key.

## What is implemented

- Three dispute packs: flight delay/cancellation, subscription cancellation, and surprise billing.
- India, European Union, and United States as initial research scopes, with unresolved applicability questions shown explicitly.
- Total case text up to 30,000 characters across the primary document, company response, and added exhibits; company responses and individual exhibits are limited to 12,000 characters each.
- Grounded extraction, minimized queries, deduplicated research, passage checks, conservative evidence ratings, and visible conflicts and unanswered questions.
- Rebuttal Lab with a bounded Nemotron function-call loop, allowlisted research/source/evidence tools, a live timeline of completed analysis stages and tool actions, and application-verified policy quotations.
- A clearly labeled offline walkthrough lets visitors remove or replace a fictional exhibit and see whether its exact passage still matches. It makes no model calls and does not estimate legal outcomes.
- Separate company-response intake and up to three added evidence documents with distinct IDs. Rechecks run from the original inputs; supplied evidence is described as added, not proof of eligibility.
- Deterministic English complaint letters that quote matching research passages and ask the company to confirm applicability. Citation records come from the application source registry.
- Editable letters with current-text download and print/PDF export, cancellation, and clear-case controls.
- Runtime request/provider validation, bounded model retries, per-call timeouts, a 120-second analysis deadline, and safe public errors.

A matching passage proves traceability, not legal applicability or entitlement. Current applicability remains unreviewed, so the application cannot give a strong rating. Escalation entries are unreviewed pack suggestions, clearly labeled for verification. It does not calculate compensation entitlements; a documented disputed charge is shown only when its numeric value and currency are explicit.

The research tool choices are model-directed; the application executes only fixed functions with enumerated inputs and registered source IDs. The overall analysis is limited to 120 seconds, three tool turns, and six tool calls. A matching passage establishes traceability only. Live-provider latency, selected-model account availability, and jurisdiction applicability have not been verified.

## Hackathon-period changes

The public repository baseline was published on October 23, 2026. During the hackathon submission period, the project was extended from a general dispute-analysis pipeline into the evidence-revision workflow described above. The substantive changes include a bounded Nemotron function-call loop for investigating the company's written objection; separate company-response and consumer-evidence handling; exact passage checks for objections and cited letter text; reanalysis when exhibits are added or removed; live, application-generated progress events; and an offline fictional walkthrough that demonstrates how removing or replacing evidence changes the traceability check. Request validation, shared production rate limits, and deployment controls were also added.

See the [repository changes since the published baseline](https://github.com/R-Hruthvik/fine-print-fighter/compare/9e683e9..HEAD) for the code history. This is a development summary, not evidence of a live deployment or successful provider run; those checks remain open. [Hackathon rules](https://nebiusglobalaihackathon.devpost.com/rules)

## Architecture

Next.js 16 App Router, React, TypeScript, and custom responsive CSS. Nebius Token Factory supplies the configured NVIDIA Nemotron model; Tavily supplies research results. No application database or saved case history.

The server pipeline extracts facts, builds initial queries from pack templates, researches and checks passages, then lets Nemotron select from a bounded set of investigation tools. The application validates final objection citations, constrains evidence ratings, constructs the letter, and returns escalation suggestions. No case history is persisted.

## Configuration

| Variable | Purpose |
| --- | --- |
| `NEBIUS_API_KEY` | Server-side model key, required for analysis |
| `NEBIUS_BASE_URL` | OpenAI-compatible endpoint; default `https://api.tokenfactory.nebius.com/v1` |
| `NEMOTRON_MODEL` | Model identifier available to your account; default `nvidia/Nemotron-3_5-Lightning` |
| `TAVILY_API_KEY` | Optional server-side research key; absent means Tavily keyless mode with limited availability |
| `ENABLE_STAGE_ROUTES` | Optional `true` enables development-only stage routes; always unavailable in production |

Case content stays in browser memory and transient server requests. The model receives document text; Tavily receives minimized queries. Routine application logs contain timing and counts, not case text. Provider and hosting retention policies still apply.

Production analysis requires a shared Upstash request budget: 12 analyses per trusted client IP per minute plus the configured global daily maximum. The app fails closed if the store, hash secret, daily cap, or trusted client-IP header is unavailable. Development uses a local 12-per-minute budget. See the [deployment guide](docs/deployment.md) for key rotation, spend-cap setup, and trusted proxy requirements. Each process also limits itself to three concurrent analyses.

## HTTP interface

`POST /api/extract` runs the full pipeline and returns JSON by default. First-party clients may request `Accept: application/x-ndjson` to receive real progress events followed by the same result or a safe error. Required JSON fields: `documentText`, `companyResponse`, `packId`, `country` (`IN`, `EU`, `US`). Optional `additionalDocuments` accepts up to three `{id,label,text}` exhibits; a recheck resubmits the original documents and does not rely on a client-provided assessment. Other optional fields: `userName`, `desiredOutcome`, `language`, `replyDeadline`. Letters currently use the English template; another requested language returns an explicit warning.

Errors contain `error`, `code`, `retryable`, and `requestId`. Responses use `Cache-Control: no-store`. Invalid input returns 400/413, budget limits 429, unavailable configuration 503, upstream failure 502, and timeout 504. If an error occurs after an NDJSON response begins, it arrives as a `{type:"error", status, error}` line while the HTTP status remains 200; failures before streaming begins use their regular HTTP status and JSON body.

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

PDF/image OCR, accounts, payments, persistence, automatic sending, multilingual templates, independently reviewed applicability, sourced procedural escalation, and compensation formulas are not implemented. Live-provider accuracy, selected-model tool-call behavior, retention configuration, jurisdiction coverage, and latency need review before public release.
