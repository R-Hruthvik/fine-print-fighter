# Fine Print Fighter: hackathon research and product decision

Researched: 23 October 2026. Sources are official organizer, vendor, and technical documentation pages. Competitor capabilities below are vendor claims, not independently verified effectiveness. Recommendations are product judgments.

This document records the baseline and product decision from 23 October. The Rebuttal Lab, separate company-response and exhibit inputs, evidence revisions, and live progress timeline described here have since been implemented; current delivery gaps are tracked in the [hackathon readiness update](../research/2026-10-24-hackathon-readiness.md).

## Decision

Make the flagship feature a **Rebuttal Lab**: inspect a company's actual denial, construct its strongest evidence-grounded explanation, investigate the weakest part of the consumer's case, and show exactly what changes when new evidence is added.

The pitch: **“See what supports your dispute, what supports the company, and exactly what evidence changes the answer.”**

Keep the existing text workflow as supporting infrastructure. Center the hackathon demonstration on one subscription dispute. Add breadth after the evidence-change mechanism works.

## Why the current version is insufficient

The implemented application mostly follows a fixed sequence: extract, search, summarize, rate, and produce a letter. A user cannot give a company rejection its own role, attach distinct exhibits, investigate one challenged claim, or compare an assessment before and after new evidence.

Nemotron currently extracts and interprets; application code selects all research steps. There is no model-selected tool loop. The result screen is primarily a long report. A judge can see output but cannot easily see an agent discovering something or changing its assessment for a specific reason.

Correctness checks are useful infrastructure. They are not the product's distinguishing mechanism.

## Competition: common additions will not solve the problem

| Product | Advertised capability | Consequence for our positioning |
| --- | --- | --- |
| [ComplaintCraft](https://complaintcraft.app/) | Country-aware consumer assessment, complaint writing, ratings, escalation, no account | Very close to the present proposition |
| [FightThis](https://fightthis.ai/) | Photo/PDF/text intake, cited dispute drafts, downloadable documents, mailing | OCR and cited letters alone are insufficient |
| [ClaimBack AI](https://claimbackai.com.au/how-it-works) | Evidence uploads, timeline, completeness score, missing-evidence prompts, response playbook, case pack and tracking | Timeline + readiness score + reply assistant is also crowded |
| [Resolver](https://www.resolver.co.uk/about) | Complaint case files, correspondence, evidence, tracking and escalation | A case dashboard is supporting functionality |
| [Pine AI](https://www.19pine.ai/) | Calls, negotiations, forms, refunds, cancellations and follow-ups | Autonomous calling is neither an empty market nor a cheap integration |
| [Rocket Money](https://www.rocketmoney.com/faq) | Subscription discovery and Premium cancellation service | We lack its transaction access and execution infrastructure |
| [AirHelp](https://www.airhelp.com/en-int/about-us/) | Flight disruption assessment and claims pursuit | Flight compensation needs operational data and domain depth to compete |
| [Nyaykar](https://www.nyaykar.in/) | India-oriented complaint intake, routing, letters and escalation | Localization alone is not the wedge |
| [DoNotPay](https://donotpay.com/) | Broad consumer automation, billing and cancellation tools | “AI fights companies for you” is established positioning |

FairShake should not be described as a currently operating end-to-end competitor: its [official about page](https://fairshake.com/about-the-site/) says the company is defunct and the site remains informational.

The reviewed pages do not establish that no competitor has an inspectable challenge/research/evidence-change loop. They establish that the simpler feature bundles already overlap substantially. The proposed distinction must be demonstrated, not advertised as a worldwide first.

## What the organizers actually reward

The official [judging update](https://nebiusglobalaihackathon.devpost.com/updates/46204-here-s-how-judging-works) explicitly favors tool-chaining autonomous workflows over single-call demonstrations. It describes four equally weighted scoring dimensions: implementation, design, impact, and idea quality.

The [official rules](https://nebiusglobalaihackathon.devpost.com/rules) establish a 30 October 2026, 10 a.m. Pacific submission deadline and a 1–15 December judging period. A runtime call to Token Factory qualifies as running on Nebius. The app also needs an NVIDIA open-source model, a working demo, public licensed source, a short public video, running instructions, and sponsor-tool feedback.

Best Apps and Agents is the appropriate track. A persuasive demonstration must make Nemotron's decisions and tool use visible while keeping the user's next action clear. Animation cannot substitute for actual branching behavior.

## Alternatives considered

| Direction | Benefit | Tradeoff | Decision |
| --- | --- | --- | --- |
| Rebuttal Lab with evidence-change comparison | Interactive reveal, visible investigation, useful even when the consumer is wrong | Needs document provenance and explicit unresolved conditions | Flagship |
| Historical policy comparison | Strong reveal when a rejection relies on a changed policy | Archive coverage and applicability dates may be uncertain | Optional extension |
| Autonomous calling/negotiation | Obvious real-world action | Crowded, integration-heavy, fragile under a short deadline | Defer |
| Community complaint pattern discovery | Potential network effect | Requires real consented data and enough cases | Defer |
| Broad OCR + letters + many jurisdictions | Easy to explain | Already widely offered; encourages shallow coverage | Supporting scope only |

The Internet Archive [Availability API](https://archive.org/help/wayback_api.php) accepts a URL and requested timestamp and returns a nearest available snapshot. A capture timestamp is not proof that a policy was contractually effective on that date. Historical comparison is useful only when that distinction stays visible and absence of an archive is handled cleanly.

## Proposed distinctive interaction

A challenge card connects four things:

1. **Company statement:** an exact excerpt of the actual rejection.
2. **Best company explanation:** a labeled interpretation grounded in policy and supplied facts.
3. **Your evidence:** identified document passages that support or challenge that explanation.
4. **Decisive gap:** one concrete fact or exhibit that could resolve the uncertainty.

The agent chooses a research action for a specific challenge, reads the resulting policy passage, and updates the challenge. When the user adds evidence, the UI shows the previous assessment, the new one, and the exact newly relevant passage. Unrelated challenges do not magically improve.

This is an evidence relationship, not a win-probability meter. The agent must also be able to conclude that the company's explanation remains supported or that the uploaded document does not resolve the gap.

## Technical path supported by current documentation

Nebius documents [OpenAI-compatible function calling](https://docs.tokenfactory.nebius.com/ai-models-inference/function-calling). The model selects a function and arguments; the application executes it and returns the tool result. This supports a bounded investigation loop using `search_company_policy`, `read_policy_page`, `compare_evidence`, and `request_evidence`.

Tavily's [Search](https://docs.tavily.com/documentation/api-reference/endpoint/search) finds candidate sources. Its [Extract](https://docs.tavily.com/documentation/api-reference/endpoint/extract) reads selected pages and returns per-URL failures even in successful HTTP responses. Full policy extraction is materially more useful here than relying on short search snippets.

The official Nebius [cookbook model list](https://raw.githubusercontent.com/nebius/token-factory-cookbook/main/models/nemotron/README.md) features Lightning, Super, and Ultra. Its Lightning example uses `nvidia/Nemotron-3_5-Lightning`. The [quickstart](https://docs.tokenfactory.nebius.com/quickstart) uses `https://api.tokenfactory.nebius.com/v1/`. The repository's prior 340B fallback and older API base should not be treated as a verified current deployment choice.

Use Lightning as the initial candidate for fast extraction/tool selection. Compare Super or Ultra on difficult challenge interpretation before selecting a second model. Do not add several models merely to display more logos. No latency or cost advantage has been measured for this application.

Nebius [structured-output documentation](https://docs.tokenfactory.nebius.com/ai-models-inference/json) describes object/schema modes but directs users to verify individual model support. Test JSON and tool calls against the chosen deployed model; preserve runtime schemas and bounded retries.

Visual invoice/screenshot intake is a useful extension. NVIDIA describes document understanding and multimodal reasoning in [Super VL](https://developer.nvidia.com/blog/nvidia-nemotron-3-5-super-vl-powers-specialized-agents-with-multimodal-reasoning/). Model capabilities do not prove that a particular Nebius endpoint accepts raw PDFs or returns bounding boxes. Demonstrate a real image request before making OCR central to the submission.

## Demonstration worth building

Target a two-to-three-minute sequence:

- Present a bill and rejection. The app separates the company's actual claims from interpretations.
- Open a challenge: the supplied cancellation request does not yet prove completed cancellation.
- Let the investigator choose and execute a policy lookup. Show the short tool result and cited passage.
- Add a cancellation confirmation. Show exactly which objection becomes contradicted or less plausible, and which conditions remain unresolved.
- Export a revised response and evidence appendix.
- Briefly show a counterexample where a new document supports the company instead. This proves that the app responds to evidence rather than always escalating.

A fictional sample bundle must be visibly labeled. A live run must make real provider calls. A recorded sample must never be presented as a current live search or a real recovered refund.

## Required proof before claiming the upgrade works

- Valid supporting passages resolve to their document or retrieved policy.
- Added evidence changes only justified challenges, with stable before/after references.
- Contradictory and irrelevant evidence do not automatically strengthen the consumer's position.
- Tool selection genuinely depends on a missing fact; it is not a fixed pipeline with animated agent names.
- Policy extraction failure, missing credentials, and exhausted budgets have honest states.
- A configured-provider run proves the chosen model supports the intended tool/JSON requests.
- Benchmark the complete loop and record actual token usage before advertising speed or cost.

## Immediate priorities

1. Replace the report-first experience with one denial-centered investigation and evidence-change demonstration.
2. Add distinct document roles and source spans.
3. Implement bounded model-directed research with real action events.
4. Add a focused adversarial review and before/after challenge comparison.
5. Generate a response from the resulting argument/evidence map.
6. Prove the live model path, then prepare deployment, license, video, and sponsor feedback.

No recommendation here requires automatic sending, fabricated success rates, or a claim to replace a lawyer.
