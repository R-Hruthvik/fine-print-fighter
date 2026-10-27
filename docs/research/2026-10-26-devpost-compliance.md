# Nebius × NVIDIA Global AI Hackathon: rule-by-rule project check

Checked against the live Devpost Official Rules in the browser on 2026-10-26. The submission deadline shown there is October 30, 2026 at 10:00 a.m. Pacific (October 30 at 10:30 p.m. IST). This is a compliance worklist, not a legal determination or a submitted entry.

## Entrant and project eligibility

| Official requirement | Current project status / action |
| --- | --- |
| Entrant is at least the local age of majority and not in an excluded/sanctioned jurisdiction. | Entrant must confirm eligibility in Devpost. |
| Entrant is not a judge, sponsor/administrator employee or agent, or otherwise conflicted. | Entrant must confirm eligibility in Devpost. |
| Register through Devpost and complete the submission during the submission period. | Submission is still an entrant action; deadline is above. |
| Project fits one of the four tracks and is a genuine working project. | Recommended track: **Best Apps and Agents**. The case objection → evidence check → revised draft flow is the project’s core consumer workflow. |
| Make a runtime call to Nebius Token Factory or run/deploy on Nebius AI Cloud, and use an NVIDIA open model. | App defaults to Nebius Token Factory and NVIDIA Nemotron 3.5 Lightning. **Not yet verified live:** no Nebius key is configured locally and the last `/api/extract` call returned `CONFIGURATION_MISSING`. A successful Token Factory call is a required gate. An OpenAI-compatible alternate provider is for local/development testing only and does not qualify the submission. |
| Existing project must be significantly updated after Aug 26, 2026; explain the changes. | README documents the Oct 23 baseline and substantial hackathon-period changes, and links the comparison. Recheck that the public comparison resolves to the submitted source revision. |
| Third-party tools, APIs, and data must be authorized under their terms. | Keep the Nebius, NVIDIA model, Tavily, and sourced-material terms in the release review. Keep demo evidence fictional or permissioned. |

## Submission package

| Official requirement | Current project status / action |
| --- | --- |
| Working demo/hosted app/test build URL. | **Missing/unverified.** Deploy a judge-accessible version and test the public URL end to end. |
| Project description explains functionality. | **Not yet verified on Devpost.** Describe the consumer problem, the evidence-change workflow, limitations, and human review. |
| Public GitHub/GitLab/Bitbucket source repo with necessary source/assets/instructions. | Repo currently points to `R-Hruthvik/fine-print-fighter`; verify the submitted repository is public and matches the tested commit. |
| Open-source license clearly visible on the repository. | Repo has MIT licensing; verify GitHub displays the license in the About area before submission. |
| README setup instructions. | Present. Keep provider configuration, test commands, architecture, and actual limitations accurate. |
| Clearly identify Nebius Token Factory/AI Cloud, NVIDIA model, and other Nebius tools. | README names Nebius Token Factory, NVIDIA Nemotron, and Tavily. Add the same to Devpost description and Built With. |
| Public YouTube demo under 3 minutes showing the project actually working. | **Missing.** Record a real run after provider access works; show the key modules in action, explain the model/tool roles, and use no unlicensed music or third-party marks. |
| Select a track. | Select **Best Apps and Agents** unless the entrant deliberately chooses another eligible track. |
| Provide honest feedback on Nebius Token Factory, AI Cloud, and NVIDIA tools/models used. | **Missing.** Record actual onboarding, integration, latency, tool-calling, quality, cost/credit, and documentation experience. Do not invent positive or negative claims. |
| Explain significant changes if project existed before the event. | README has a dated summary and source comparison. Repeat a concise explanation in the Devpost submission. |
| Make the project available free and without restriction through Dec 15 judging end. | **Missing/unverified.** Keep the deployed demo reachable and free through the judging period; avoid judge-only signup/payment gates. |
| All submission materials in English or provide English translations. | Current app, README, and demo plan are English. Confirm the final description and test instructions are also English. |
| Entrant/team owns original submission and has rights for all assets/data. | Use synthetic case documents and properly licensed assets. Do not expose real consumer records, private information, or unlicensed copyrighted material. |

## Judging and optional awards

- Stage 1 is pass/fail for theme fit and genuine use of required platform/model.
- Stage 2 weights technological implementation, design, potential impact, and idea quality equally. The demo should show one complete workflow with real provider activity and honest evidence limits.
- The Best Use of Tavily bonus requires a functional runtime Tavily API call as part of the project. The code integrates Tavily, but preserve evidence of a successful app run using it.
- A City Winner requires attending the relevant participating in-person event; do not claim eligibility without attendance.
- Each project may win one overall award **or** one track award, plus one bonus award.

## Entrant actions and material ambiguity

- Confirm age, jurisdiction, conflict, representation, and team-member eligibility in Devpost. If submitting for a team or organization, appoint an authorized representative.
- Do not treat promo credits or a Nebius account as proof of qualifying runtime use. Test the actual submitted app via Token Factory with an NVIDIA open model.
- The rules contain a “Financial or Preferential Support” exclusion for projects developed with sponsor/administrator support, while Devpost separately advertises hackathon credits and Builder Program credits. Before relying on those credits for this project, request written clarification from the organizer about whether these hackathon-issued credits count as excluded support. Do not assume either answer.
- Submission permits specified sponsor/Devpost promotional use of project materials and contributor name/likeness during the event and for three years after. Review the full Official Rules and Devpost terms before submitting.

## Verification evidence to collect

1. Successful live analysis request ID, model identifier, request durations, source records, Tavily call result, and safe logs (no keys or real case text).
2. Public demo URL tested signed out and from a second browser; no login or payment restriction for judges.
3. Public repository URL, visible MIT license, setup steps, and source commit matching the deployed app.
4. YouTube URL and measured runtime under 3:00.
5. Completed, factual provider/model feedback and final Devpost fields.

Official references: [rules](https://nebiusglobalaihackathon.devpost.com/rules), [FAQ](https://nebiusglobalaihackathon.devpost.com/details/faqs), [submission advice](https://nebiusglobalaihackathon.devpost.com/updates/46205-how-to-build-a-winning-project), [project resources](https://nebiusglobalaihackathon.devpost.com/resources).
