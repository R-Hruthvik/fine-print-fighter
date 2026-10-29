# Fine Print Fighter — demo production plan

Prepared October 28, 2026. Research and proposed production package; no video recorded or published. Supersedes the older offline-first storyboard. Recommended track: Best Apps and Agents.

## The story

**A cancellation attempt is not a cancellation confirmation. Help a customer see what their documents support, what remains uncertain, and what to ask next.**

Use one fictional subscription dispute, with an invented provider name and no brand assets. Alex attempted cancellation October 8, was charged $15.99 October 10, and received an unsatisfactory reply. A later confirmation establishes service ended October 12 and future renewals stopped; it does not settle the October 10 charge. That distinction is the reveal. Do not present a refund victory or accuse a real business.

Approaches considered:

- **Recommended: narrated customer screencast, 2:45.** Shows usefulness, interaction, research and evidence changes in one coherent story. Requires two completed analyses and deliberate editing of waits.
- Technical architecture tour: easier to explain internals but weaker evidence of a complete consumer experience. Keep architecture to ten seconds.
- Feature montage across three complaint types: breadth at the expense of comprehension. Save breadth for the written submission.

This recommendation is the preparer's choice, not a user-approved recording treatment. No product code changes are required for this plan.

## Rules verified today

[Official rules](https://nebiusglobalaihackathon.devpost.com/rules), summarized:

- Deadline: October 30, 2026, 10:00am PDT / **10:30pm IST**.
- Working app must use an NVIDIA open-source model and make a Token Factory runtime call or run on Nebius AI Cloud. This track specifically calls for Nemotron on Nebius through Token Factory.
- Video: under three minutes; actual functioning app footage; public YouTube link. English or English translation. Third-party trademarks/copyright material require permission.
- Supply working app/test link, public licensed source, setup instructions, feature description, track and technology feedback. Explain substantial hackathon-period changes for pre-existing work.
- Judges need free unrestricted testing access through December 15; provide credentials if private.

This is a production digest, not a substitute for the complete eligibility, ownership and integration terms.

## What judges should see

The [judging update](https://nebiusglobalaihackathon.devpost.com/updates/46204-here-s-how-judging-works) describes a viability gate, then equally weighted implementation, design, impact and idea quality. It favors meaningful multi-step tool workflows for this track. Allocate footage accordingly:

| Criterion | Evidence in our footage |
| --- | --- |
| Implementation | Actual extraction, search progress, source inspection and reanalysis; short truthful provider/model caption |
| Design | Customer confirms facts; one next action; evidence details disclosed on demand; editable reply |
| Impact | A person with a disputed charge gets a specific question and usable draft, without needing specialist terminology |
| Idea | New evidence changes the record while uncertainty remains visible; this is more than generating a complaint paragraph |

Do not claim unique-in-market status, measured user savings, legal accuracy, or proven scale. We have no evidence for those claims.

## Recording gates, in order

1. **Nebius integration is unverified.** Latest successful runs used the local OpenAI-compatible Kilo router and `kc/nvidia/nemotron-3.5-super-vl:free`. This does not establish Nebius usage. Configure an authorized Token Factory NVIDIA model, verify its available identifier/tool/JSON support, and complete the same real journey. Preserve sanitized model/provider/run evidence. Never put secrets in footage or Git. Do not narrate Token Factory until verified.
2. **Public judge access is unverified.** Deploy using `docs/deployment.md`, configure shared production budgets, and test signed out through the submitted URL. Judge access must not require their own API key. Capacity controls must leave judges a usable route.
3. **Prepare an original fictional recording packet.** Existing test packet names Netflix; replace that packet's provider with an invented name for filming, clearly labeled FICTIONAL TEST ONLY. Re-run it because changing the company changes research. Do not simply rename old outputs. Clear any other third-party assets featured in footage.
4. Complete two consecutive initial-review → add-confirmation → recheck journeys on the final deployment. Check actual output, snippet limitations, exported edited text, source links and errors. Fix any blocker before filming. Preserve all takes; do not splice different results into one invented run.
5. Freeze the recording revision and list actual model, provider, research mode, run durations, supported input formats and known limits. Confirm public repository license/setup and written change history. Draft sponsor feedback from observed experience.

Existing evidence: `audit/live-customer/followup-conflict-gate-retest.ndjson` completed in approximately 40.2 seconds, with a matched confirmation and no fabricated date conflict. This is a local-provider test, not a hosted/Nebius benchmark or guaranteed runtime. Prior runs were slower; allow several minutes per take.

## Shot list — target 2:45, hard ceiling 2:55

| Time | Actual screen/action | Viewer takeaway |
| --- | --- | --- |
| 0:00–0:12 | Start on the disputed-charge record, with small product title and fictional-case caption | Concrete human problem immediately |
| 0:12–0:30 | Open review flow; provide customer record, receipt/support text and company response | Separate the customer's account from the company's explanation |
| 0:30–0:45 | Review extracted facts; briefly show/correct one field if needed; confirm jurisdiction | The customer controls the factual starting point |
| 0:45–1:02 | Submit; retain a few seconds of real progress, then cut to completed result | Actual model/research workflow; label any removed waiting time |
| 1:02–1:22 | Show Next step and one focused question; open one evidence detail | Attempted cancellation is not confirmed; search text is not legal proof |
| 1:22–1:42 | Add the withheld October 12 confirmation as a separate exhibit; recheck | New evidence enters the same case |
| 1:42–2:05 | Show before/after and exact matched passage; hold the remaining disputed charge | Service end is documented; refund remains unresolved |
| 2:05–2:25 | Open Your reply; edit one sentence and download | Customer gets a usable next action and retains control |
| 2:25–2:37 | Short architecture overlay over actual app/progress footage | Documents → Nemotron → Tavily search → application checks → draft |
| 2:37–2:45 | Return to focused outcome; close with product purpose | Understand the record and ask a better question |

If the final live run produces no objection or a different question, rewrite the narration to that run. Never manufacture the expected output. If a source cannot be read, show the limitation and avoid the unsupported sentence. Capture an irrelevant-exhibit and search-failure test for QA; include only if it strengthens the main story within the time budget.

## Claim-to-proof discipline

| Safe claim | Show/prove | Avoid |
| --- | --- | --- |
| Searches the web | Actual completed Tavily searches and one retained result | “Read and verified every policy” |
| Source passage matches | Exact visible quote with document identity | “The claim is true” or “legally verified” |
| Uses Nemotron | Sanitized exact model and actual runtime events | Assuming a configured name proves successful usage |
| Uses Nebius | Successful Token Factory runtime, or applicable verified Nebius compute evidence | Calling the local router Nebius |
| New evidence changes the review | Confirmation and actual revised result | A green resolved badge for an unpaid dispute |
| Prepares a reply | Edit and export current draft | Automatic sending, filing, refund or legal representation |

Current research uses Tavily keyless search successfully. Without a Tavily key, full-page extraction is skipped: results can be search snippets with unknown freshness and unreviewed applicability. Narration must say research starting points, not verified law. Current app accepts text/Markdown; do not film PDF/image ingestion or imply OCR.

## Production method

[Devpost's own video guidance](https://help.devpost.com/article/84-video-making-best-practices) recommends narrated screencasts, an immediate explanation, a script, rehearsal, editing and early upload. Our concrete production choices:

- Capture actual browser footage at 1920×1080, 30fps. Test 125% browser zoom; if it clips the UI, choose a smaller viewport captured without reducing text readability. Check the exported video at 720p on a laptop before accepting it.
- Keep the existing warm paper/ink palette. No bright new effects or full-screen source dumps. One focal element per shot; open only the detail being discussed. Hide unrelated tabs, notifications, credentials and personal bookmarks.
- Use cursor movement deliberately, pause after clicks, and hold key result text for 3–5 seconds. Use direct cuts; no spinning transitions or decorative typing animation.
- Record clean narration separately in a quiet room. Aim around 120–135 words/minute, leave room for evidence holds, and use human speech. No music needed. Add accurate English captions, normally two lines maximum, approximately 28–36px in 1080p; move them if they cover controls.
- Remove waits with a visible caption such as “Analysis completed in 48 seconds; waiting shortened” using the measured take, not an estimate. Keep normal playback for meaningful interactions. Do not label edited footage “uncut live.”
- Retain raw capture and a take log: revision, input packet, provider/model, timestamps, durations, source mode, outcome, edit decisions. Save no keys or real customer data.
- `ffmpeg` is installed here; OBS/Kdenlive were not found on PATH. Browser-harness can capture the browser session; use its documented recording/video workflow when recording starts. Install nothing until a capture method needs it. Export H.264 MP4, yuv420p, AAC audio, fast-start metadata; verify duration/audio with ffprobe and watch the entire export.

Frontend-learn requirement applied: the output must remain readable at normal playback size. Its typography/hierarchy research supports preserving clear type scale and measuring the rendered result instead of trusting token definitions. Sources consulted: `Documents/frontend/README.md`, `distilled/INDEX.md`, `distilled/KB_TENETS.md`, and `distilled/03_typography.md`. The 720p check and caption sizes above are production recommendations, not archive-derived standards.

## Deliverables and completion checklist

- [ ] Final original fictional packet and completed final-provider runs.
- [ ] Public app, signed-out test, judge-access instructions and capacity plan.
- [ ] Raw browser clips, sanitized take log and clean voice track.
- [ ] Edited 2:45 MP4, reviewed captions, readable 720p playback, no secrets/unlicensed assets.
- [ ] Public YouTube upload; check in a signed-out browser after processing.
- [ ] Submission links: video, working app, public source; English description, track, honest sponsor feedback and prior-work disclosure.

Suggested title: **Fine Print Fighter — from disputed charge to evidence-backed reply**.
Suggested description: “A fictional subscription dispute demonstrates fact review, live research, evidence rechecking, and an editable customer reply. Document matches do not establish legal entitlement. No message is sent automatically.” Add actual verified stack and public links once ready.

Aim to finish the upload October 29, leaving October 30 for processing, access checks and submission corrections. This is an internal target, not an organizer deadline. Publication/submission has not been performed.
