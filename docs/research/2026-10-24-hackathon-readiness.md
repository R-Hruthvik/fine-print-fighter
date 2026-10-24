# Hackathon readiness update

*Research date: October 24, 2026. Scope: official Nebius x NVIDIA hackathon rules and judging guidance, current model positioning, and implications for Fine Print Fighter.*

## What the organizers currently emphasize

The submission deadline is October 30, 2026 at 10:00 a.m. Pacific. Entries need a working project link, public source with a detectable open-source license, README setup guidance, an under-three-minute public YouTube demo, sponsor/model feedback, and a written explanation of substantial changes if the project predates the submission period. Judges must have free access through December 15. [Official rules](https://nebiusglobalaihackathon.devpost.com/rules)

The October 22 judging-session recap advises builders to reveal the central “aha” quickly, prioritize one polished end-to-end workflow over a broad stack, and clearly identify each model's role. It also recommends showing failure cases as evidence of rigor. The official gallery is not yet published, so this research cannot establish that the Rebuttal Lab is unique across all entries. [Organizer recap](https://nebiusglobalaihackathon.devpost.com/updates/47163-recording-will-your-project-ship), [project gallery](https://nebiusglobalaihackathon.devpost.com/project-gallery)

The earlier judging explanation says multi-step workflows that chain tools stand out in Best Apps and Agents, while the latest recap clarifies that tool count itself is not the goal. Judging weights implementation, design, impact, and idea quality equally after a viability gate. [Judging explanation](https://nebiusglobalaihackathon.devpost.com/updates/46204-here-s-how-judging-works)

## Current model position

Nebius recommends Nemotron 3.5 Lightning for efficient agentic reasoning and lists tool calling among current Token Factory capabilities. The current identifier in our server defaults is `nvidia/Nemotron-3_5-Lightning`. This catalog-level support does not prove that our exact schema and account credentials work; a live contract check remains a delivery gate. [Nebius model catalog](https://nebius.com/services/token-factory/models/nvidia-nemotron-models-inference), [function-calling guide](https://docs.tokenfactory.nebius.com/ai-models-inference/function-calling)

## Product implications

**Research-backed project inference:** show one complete evidence-change loop rather than adding more dispute categories or integrations. The intended reveal is: a company rejection presents an objection; retained policy text grounds the hypothesis; the system names a missing exhibit; an exact passage in newly added evidence is checked and shown as a review suggestion; the revised letter cites the evidence and asks the company to clarify what remains unresolved. Do not depict the added document as proof of legal eligibility.

Make the first screen self-explanatory, identify which actions Nemotron selects and which checks the application enforces, and show one failure example such as an irrelevant exhibit or missing source. The fictional sample must visibly say that its company reply is invented while external research is live.

**Additional product inference:** complaint-letter templates and attachments are established parts of consumer complaint workflows: the FTC recommends naming supporting enclosures in a letter, and the CFPB accepts supporting documents and later asks consumers to review the company's response. The defensible demo emphasis is the traceability check: removing a document, substituting irrelevant text, or editing a quoted passage changes whether that exact passage is present. The new offline walkthrough marks every element fictional and makes no provider call. This is a product demonstration, not a claim of unique capability across all competitors. [FTC letter guidance](https://consumer.ftc.gov/articles/sample-customer-complaint-letter), [CFPB complaint process](https://www.consumerfinance.gov/complaint/)

## Delivery backlog

1. Run a real configured model request and record the actual model, latency, function calls, returned source references, and limitations. Track in [live provider contract verification](https://github.com/R-Hruthvik/fine-print-fighter/issues/11).
2. Prepare and deploy a judge-accessible demo, 30-second story, under-three-minute video, model/provider explanation, feedback, and failure examples. Track in [judge-ready demo](https://github.com/R-Hruthvik/fine-print-fighter/issues/3).
3. Hold the product scope to the subscription rejection → objection → evidence → recheck path until its sourcing, UX, and failure handling are dependable.
4. Only consider image/OCR intake after a live endpoint test confirms supported media formats and the app can present extracted text for user review. NVIDIA describes visual document reasoning for Super VL, but the model announcement alone does not establish Nebius endpoint limits or PDF ingestion. [NVIDIA model article](https://developer.nvidia.com/blog/nvidia-nemotron-3-5-super-vl-powers-specialized-agents-with-multimodal-reasoning/)

## Confidence and limitations

High confidence for submission requirements and organizer guidance because they come from current official event pages. Medium confidence for product differentiation: prior competitor research found substantial overlap in dispute drafting and evidence organization, but no public 2026 submission gallery is available for a complete comparison. No live user interviews or live model calls were performed for this update.
