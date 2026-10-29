"use client";
import { factLabel } from "@/lib/fact-labels";

import { useEffect, useState, type FormEvent } from "react";
import type { AnalysisProgressEvent, PipelineResult } from "@/lib/types";
import { buildReviewSummary } from "@/lib/review-summary";
import { COUNTRIES } from "@/lib/packs";
import { exportLetter, safeUrl } from "./workflow";
import { AnalysisProgress } from "./AnalysisProgress";

function SourceLink({ url, children }: { url: string; children: React.ReactNode }) {
  const href = safeUrl(url);
  return href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a> : <span>{children} (link unavailable)</span>;
}

function Notes({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <details className="analysis-notes"><summary>{title} ({items.length})</summary><ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></details>;
}

function sourceTextStatus(source: PipelineResult["sources"][number]): string {
  if (source.retrieval === "provider_extract" && source.extractionStatus === "extracted") return "Page text extracted";
  if (source.extractionStatus === "failed") return "Search snippet fallback · page extraction failed";
  if (source.extractionStatus === "skipped_no_key") return "Search snippet · extraction skipped";
  if (source.extractionStatus === "not_selected") return "Search snippet · not selected for extraction";
  return "Search snippet only";
}

function sourceAuthorityStatus(authority: PipelineResult["sources"][number]["authority"]): string {
  if (authority === "regulator") return "Official regulator page in reviewed source list";
  if (authority === "official_company") return "Official company domain in reviewed directory";
  if (authority === "official_explainer") return "Official explainer in reviewed source list";
  return "Unreviewed publisher";
}

type AdditionalDocument = { id: string; label: string; text: string; role?: "record" | "company-reply" };
export function CaseResult({ result, initialLetter, previousResult = null, additionalDocuments = [], exhibitRemovalPending = false, onRemoveDocument, isFictionalSample = false, onReset, onRecheck, rechecking = false, progressEvents = [], recheckError, recheckNotice, onCancelRecheck, onLetterChange }: {
  result: PipelineResult;
  initialLetter?: string;
  previousResult?: PipelineResult | null;
  additionalDocuments?: AdditionalDocument[];
  exhibitRemovalPending?: boolean;
  onRemoveDocument?: (id: string) => void;
  isFictionalSample?: boolean;
  onReset: () => void;
  onRecheck: (additionalDocuments: AdditionalDocument[]) => Promise<void>;
  rechecking?: boolean;
  progressEvents?: AnalysisProgressEvent[];
  recheckError?: string | null;
  recheckNotice?: string | null;
  onCancelRecheck?: () => void;
  onLetterChange?: (letter: string) => void;
}) {
  const [letter, setLetter] = useState(initialLetter ?? result.letter);
  const [selectedObjection, setSelectedObjection] = useState<string | null>(null);
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, {label:string;text:string}>>({});
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceRole, setEvidenceRole] = useState<"record" | "company-reply">("record");
  const rebuttalLab = result.rebuttalLab;
  const selectedDraft = selectedObjection ? evidenceDrafts[selectedObjection] ?? {label:"",text:""} : {label:"",text:""};

  useEffect(() => {
    if (selectedObjection) document.getElementById("evidence-label")?.focus();
  }, [selectedObjection]);

  function closeEvidenceForm() {
    const previous = selectedObjection;
    setSelectedObjection(null);
    if (previous) requestAnimationFrame(() => document.getElementById(`add-evidence-${previous}`)?.focus());
  }

  async function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rechecking || !selectedObjection) return;
    if (!selectedDraft.label.trim() || !selectedDraft.text.trim()) {
      setEvidenceError("Give this exhibit a label and paste the additional evidence.");
      return;
    }
    if (selectedDraft.text.length > 12_000) {
      setEvidenceError("Additional evidence exceeds 12,000 characters. Shorten it before rechecking.");
      return;
    }
    setEvidenceError(null);
    await onRecheck([{ id: `e-${crypto.randomUUID()}`, label: selectedDraft.label.trim(), text: selectedDraft.text, role: selectedObjection === "general" ? evidenceRole : "record" }]);
  }
  const [reviewView, setReviewView] = useState<'next' | 'details' | 'letter' | 'sources'>('next');
  const summary = buildReviewSummary(result);
  const sourceMap = new Map(result.sources.map((source) => [source.id, source]));
  const country = COUNTRIES.find((item) => item.code === result.country)?.label ?? "Selected jurisdiction";
  const unanswered = result.unanswered ?? [];
  const unverified = result.unverified ?? [];
  const conflicts = result.conflicts ?? [];
  const warnings = result.warnings ?? [];
  const citations = result.letterCitations.filter((citation) => safeUrl(citation.url));
  const noEvidence = !result.sources.length || result.score.coverage === "none";

  function download() {
    const disclosure = isFictionalSample ? "FICTIONAL SAMPLE: The example consumer, company, and response are invented. Research is live; it does not establish company policy or eligibility.\n\n" : "";
    const blob = new Blob([disclosure, exportLetter(letter, citations)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "complaint-letter.txt";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <div className="screen-only guided-review" data-review-view={reviewView} onClick={event => {
        const target = event.target as HTMLElement;
        const link = target.closest('a[href^="#source-"]');
        if(link) { setReviewView('sources'); const id = link.getAttribute('href')!.slice(1); requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView()); }
      }}>
        <div className="results-title"><div><p className="eyebrow">Your case, organized</p><h1>Your next step.</h1><p>Research scope: {country}. Review the evidence and fill any gaps before taking action.</p>{isFictionalSample ? <p className="fictional-disclosure" role="note"><strong>Fictional demo.</strong> The example consumer, company, and reply are invented. Research is live; it does not establish company policy or eligibility.</p> : null}<p className="model-attribution">Analysis model: <strong>{result.run.model}</strong> · Web research: Tavily ({result.run.researchMode === "keyed" ? "configured key" : "keyless, rate-limited"})</p></div><button className="secondary-button" onClick={onReset}>Start a new case <span aria-hidden="true">↗</span></button></div>
        <section hidden={reviewView !== "next"} className="decision-summary" aria-labelledby="decision-heading">
          <h2 id="decision-heading">{summary.title}</h2><p>{summary.explanation}</p>
          {summary.questions.length ? <ul>{summary.questions.slice(0, 2).map(q => <li key={q}>{q}</li>)}</ul> : null}
          {result.documentAudit?.records.length || result.documentAudit?.companyReply ? <div className="document-audit" aria-label="What the supplied documents say">
            {result.documentAudit.records.length ? <details><summary>What your records say ({result.documentAudit.records.length})</summary><p>These passages come from supplied text. Check the surrounding document and the interpretation before relying on them.</p><dl>{result.documentAudit.records.map((record, index) => <div key={`${record.documentId}-${record.label}-${index}`}><dt>{record.label}</dt><dd>{record.value}<blockquote>“{record.excerpt}”</blockquote><small>From {record.documentLabel} · {record.documentId}</small></dd></div>)}</dl></details> : null}
            {result.documentAudit.companyReply ? <details><summary>Company reply you supplied</summary><p>This is the company’s account. It has not been independently verified.</p><blockquote style={{whiteSpace:"pre-wrap"}}>{result.documentAudit.companyReply}</blockquote></details> : null}
          </div> : null}
          <details className="truth-status"><summary>What is checked—and what is still uncertain?</summary><p><strong>Your record:</strong> statements extracted from your documents, not independently verified.</p><p><strong>Web research:</strong> {summary.limitations[0]}</p><p><strong>Advice:</strong> a request for clarification, not a decision that a refund or legal remedy is owed.</p></details><p className="research-coverage-note">{summary.limitations[0]}</p>
          <div className="letter-actions"><button className="primary-button" onClick={() => setReviewView(summary.nextAction === 'Review the details' ? 'details' : 'letter')}>{summary.nextAction}</button><button className="secondary-button" type="button" disabled={rechecking || additionalDocuments.length >= 3} onClick={() => { setReviewView("details"); setSelectedObjection("general"); setEvidenceError(null); }}>Add a document or reply</button></div>
        </section>
        <nav className="review-views" aria-label="Your review">
          {([['next','Next step'],['details','Why this?'],['letter','Your reply'],['sources','Evidence record']] as const).map(([id,label]) => <button key={id} type="button" aria-pressed={reviewView === id} onClick={() => { setReviewView(id); requestAnimationFrame(() => { const target=document.querySelector(id === 'letter' ? '#letter-heading' : id === 'sources' ? '#evidence-heading' : id === 'details' ? '#rebuttal-heading' : '#decision-heading') as HTMLElement | null; target?.setAttribute('tabindex','-1'); target?.focus({preventScroll:true}); target?.scrollIntoView({block:'start'}); }); }}>{label}</button>)}
        </nav>
        {previousResult ? <section className="revision-panel" aria-labelledby="revision-heading"><div><p className="eyebrow">Revision comparison</p><h2 id="revision-heading">Review before and after the exhibit</h2><p>Each analysis is shown separately. A changed hypothesis is not a verified outcome.</p></div><div className="revision-columns"><div><h3>Prior review</h3><div className="revision-list">{previousResult.rebuttalLab.objections.length ? previousResult.rebuttalLab.objections.map((objection,index) => <article key={`${index}-${objection.hypothesis}`}><strong>{objection.hypothesis}</strong><span>{objection.status}</span>{objection.supportingPassage ? <blockquote>“{objection.supportingPassage}”</blockquote> : <small>No exact source passage was retained.</small>}</article>) : <p>No structured company objection was returned in this review. This does not establish that an earlier concern was resolved.</p>}</div></div><div><h3>Current review</h3><div className="revision-list">{result.rebuttalLab.objections.length ? result.rebuttalLab.objections.map((objection,index) => <article key={`${index}-${objection.hypothesis}`}><strong>{objection.hypothesis}</strong><span>{objection.status}</span>{objection.evidenceMatch ? <blockquote>“{objection.evidenceMatch.passage}”</blockquote> : objection.supportingPassage ? <blockquote>“{objection.supportingPassage}”</blockquote> : <small>No exact source passage was retained.</small>}</article>) : <p>No structured company objection was returned in this review. This does not establish that an earlier concern was resolved.</p>}</div></div></div></section> : null}
        <div className="results-layout">
          <div className="results-primary">
            <section className="strength-panel" aria-labelledby="strength-heading"><div className="strength-topline"><p className="eyebrow">Evidence assessment</p><span className="status-label">{noEvidence ? "Insufficient evidence" : `${result.score.coverage ?? "limited"} quote coverage · weak rating`}</span></div><h2 id="strength-heading">{noEvidence ? "More source material is needed." : "Quote traceability checked; claim support is unreviewed."}</h2><ul>{result.score.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul><p className="assessment-note">The rating stays weak until source relation is separately reviewed. It does not predict a legal outcome.</p>{result.score.evidenceToGather.length ? <div className="gather-evidence"><h3>What to gather next</h3><ul>{result.score.evidenceToGather.map((item, index) => <li key={index}>{item}</li>)}</ul></div> : null}</section>

            <section className="rebuttal-lab" aria-labelledby="rebuttal-heading">
              <div className="rebuttal-heading"><div><p className="eyebrow">Investigate the explanation</p><h2 id="rebuttal-heading">The company’s explanation</h2></div><span className="status-label">Evidence, not assumptions</span></div>
              <p className="section-description">Examine the company’s possible objection, see the missing evidence, and add a specific document to recheck the record. New evidence may support either side.</p>
              {recheckNotice ? <p className="feedback notice-feedback" role="status">{recheckNotice}</p> : null}
              {additionalDocuments.length ? <div className="retained-exhibits"><h3>Exhibits included in this review ({additionalDocuments.length}/3)</h3><ul>{additionalDocuments.map((document) => <li key={document.id}><span>{document.label} · {document.id}</span><button className="text-button" type="button" disabled={rechecking} onClick={() => onRemoveDocument?.(document.id)}>Remove from next recheck</button></li>)}</ul></div> : null}
              {recheckError ? <p className="feedback error-feedback" role="alert">{recheckError}</p> : null}
              {exhibitRemovalPending ? <div className="exhibit-removal-pending"><div><strong>Removed exhibits are excluded from the next analysis.</strong><p>The current result still includes them until a recheck succeeds.</p></div><button className="primary-button" type="button" disabled={rechecking} onClick={() => void onRecheck([])}>{rechecking ? "Recheck in progress" : "Recheck remaining evidence"}<span aria-hidden="true">→</span></button></div> : null}
              {!rechecking && progressEvents.some(event => event.type === "document-audit") ? <section className="recheck-progress" aria-label="Incomplete follow-up review"><div><p>The follow-up stopped before it finished. The previous completed review remains unchanged; the early document review is below.</p><AnalysisProgress events={progressEvents} recheck stopped /></div></section> : null}
              {rechecking ? <div className="recheck-progress"><div><p className="recheck-status" role="status"><span className="activity-indicator" aria-hidden="true" />Rechecking the supplied record. Your previous analysis stays visible until the revision is ready.</p><AnalysisProgress events={progressEvents} recheck /></div><button className="secondary-button" type="button" onClick={onCancelRecheck}>Cancel recheck</button></div> : null}
              {rebuttalLab?.objections.length ? <div className="objection-list">{rebuttalLab.objections.map((objection, index) => <article className="objection-card" key={objection.id}>
                <div className="objection-topline"><span className="small-label">Objection {String(index + 1).padStart(2, "0")}</span><span className="status-label">{objection.status === "document-provided" ? "Document provided · review required" : objection.status === "unsupported" ? "Unsupported by the record" : "Evidence still needed"}</span></div>
                <h3>{objection.hypothesis}</h3>
                {objection.supportingPassage ? <div className="objection-excerpt"><span className="small-label">Supporting excerpt</span><blockquote>“{objection.supportingPassage}”</blockquote></div> : <p className="field-hint">No supporting excerpt has been established for this hypothesis.</p>}
                {objection.evidenceMatch ? <div className="objection-excerpt"><span className="small-label">Potentially relevant added evidence · review this match</span><p className="field-hint">{objection.evidenceMatch.label} · {objection.evidenceMatch.documentId}</p><blockquote>“{objection.evidenceMatch.passage}”</blockquote></div> : null}
                {objection.sourceIds.length ? <div className="finding-sources">{objection.sourceIds.map((id) => sourceMap.has(id) ? <a key={id} href={`#source-${id}`}>Source [{id}]</a> : <span key={id}>Reference [{id}] · not in the research registry</span>)}</div> : null}
                <div className="objection-gap"><h4>Evidence gap</h4>{objection.evidenceNeeded.length ? <ul>{objection.evidenceNeeded.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul> : <p>No additional evidence request was identified. Review the supporting record before relying on this conclusion.</p>}</div>
                <button id={`add-evidence-${objection.id}`} className="secondary-button" type="button" aria-expanded={selectedObjection === objection.id} aria-controls="rebuttal-evidence-form" disabled={rechecking || additionalDocuments.length >= 3} onClick={() => { setSelectedObjection(objection.id); setEvidenceError(null); }}>Add evidence for this objection <span aria-hidden="true">→</span></button>
              </article>)}</div> : <p className="empty-note">We have not established a specific company objection. You can still add a document or a new company reply below.</p>}
              <button className="secondary-button" id="add-evidence-general" type="button" disabled={rechecking || additionalDocuments.length >= 3} onClick={() => {setSelectedObjection('general');setEvidenceError(null);}}>Add a document or company reply</button>
              {additionalDocuments.length >= 3 ? <p className="field-hint">The three exhibit limit is reached. Remove an exhibit above to add a different one.</p> : null}
              {rebuttalLab?.actions.length ? <details className="investigation-actions"><summary>Investigation actions <span>{rebuttalLab.actions.length}</span></summary><ol>{rebuttalLab.actions.map((action, index) => <li key={`${action.tool}-${index}`}><div className="action-topline"><strong>{action.tool.replaceAll("_", " ")}</strong><span>{(action.durationMs / 1000).toFixed(1)}s</span></div><p>{action.summary}</p>{action.sourceIds.length ? <div className="finding-sources">{action.sourceIds.map((id) => sourceMap.has(id) ? <a key={id} href={`#source-${id}`}>Source [{id}]</a> : <span key={id}>Reference [{id}]</span>)}</div> : null}</li>)}</ol></details> : null}
              {selectedObjection ? <form id="rebuttal-evidence-form" className="rebuttal-evidence-form" onSubmit={submitEvidence} aria-busy={rechecking}>
                <h3>{selectedObjection === "general" ? "Add a document or company reply" : "Add evidence for this objection"}</h3>{selectedObjection !== "general" ? <p className="field-hint">For: {rebuttalLab?.objections.find((item) => item.id === selectedObjection)?.hypothesis}</p> : <p className="field-hint">Paste the new text and give it a name. The whole review will run again.</p>}
                <fieldset disabled={rechecking}><legend className="sr-only">Additional evidence for the selected objection</legend>{selectedObjection === "general" ? <label htmlFor="evidence-role">What are you adding?<select id="evidence-role" value={evidenceRole} onChange={event => setEvidenceRole(event.target.value as "record" | "company-reply")}><option value="record">My document or record</option><option value="company-reply">A new company reply</option></select></label> : null}<label htmlFor="evidence-label">Exhibit label<input id="evidence-label" value={selectedDraft.label} onChange={(event) => setEvidenceDrafts((previous) => ({...previous,[selectedObjection!]:{...selectedDraft,label:event.target.value}}))} maxLength={100} placeholder="For example, cancellation confirmation" required /></label><label htmlFor="additional-evidence">Additional document text<textarea id="additional-evidence" value={selectedDraft.text} onChange={(event) => setEvidenceDrafts((previous) => ({...previous,[selectedObjection!]:{...selectedDraft,text:event.target.value}}))} placeholder="Paste the exact confirmation, policy excerpt, or reply. Include relevant dates and wording." aria-describedby="additional-evidence-hint" required /></label><p id="additional-evidence-hint" className="field-hint">{selectedDraft.text.length.toLocaleString("en-IN")} / 12,000 characters per exhibit. The form keeps longer pastes intact and explains when they exceed the limit. All case documents together have a 30,000 character limit. The whole review runs again. Keep a copy of your edits before rechecking.</p></fieldset>
                {evidenceError ? <p className="feedback error-feedback" role="alert">{evidenceError}</p> : null}
                <div className="letter-actions"><button className="primary-button" type="submit" disabled={rechecking}>Recheck with this evidence<span aria-hidden="true">→</span></button>{!rechecking ? <button className="text-button" type="button" onClick={closeEvidenceForm}>Close evidence form</button> : null}</div>
              </form> : null}
            </section>

            {unanswered.length || unverified.length || conflicts.length || warnings.length ? <section className="result-section limitations-section" aria-labelledby="limitations-heading"><p className="eyebrow">Read before acting</p><h2 id="limitations-heading">What we couldn’t establish</h2><Notes title="Research limitations" items={warnings} /><Notes title="Unanswered questions" items={unanswered} /><Notes title="Possible inconsistencies to check" items={conflicts} /><Notes title="Unsupported possibilities" items={unverified} /></section> : null}

            {result.scopeAnswers?.answers.length ? <section className="result-section" aria-labelledby="scope-answers-heading"><div className="section-title"><span className="section-number">01a</span><h2 id="scope-answers-heading">Scope details you entered</h2></div><p className="section-description">These are your answers, separate from facts extracted from your documents. They have not been corroborated and do not determine legal eligibility.</p><dl className="facts-list">{result.scopeAnswers.answers.map((answer) => <div key={answer.key}><dt>{answer.label}</dt><dd>{answer.value ?? "Not provided"}<span className="field-hint"> · {answer.provenance === "user_answer" ? "Your answer" : "Unknown source"}</span></dd></div>)}</dl></section> : null}

            <section className="result-section" aria-labelledby="facts-heading"><div className="section-title"><span className="section-number">01</span><h2 id="facts-heading">The facts from your document</h2></div><p className="section-description">Check these against the original. These are extracted statements, not independently confirmed facts. The author of quoted text may not be clear.</p><dl className="facts-list">{Object.entries(result.facts).map(([key, value]) => <div key={key}><dt>{factLabel(key)}</dt><dd>{Array.isArray(value) ? value.length ? value.join(" · ") : "Not stated" : String(value ?? "Not stated")}{result.factEvidence?.[key]?.excerpts.map((excerpt, index) => <blockquote className="fact-provenance" key={`${index}-${excerpt}`}>Primary document [{result.factEvidence[key].documentId}]: “{excerpt}”</blockquote>)}</dd></div>)}</dl></section>

            <section className="result-section" aria-labelledby="findings-heading"><div className="section-title"><span className="section-number">02</span><h2 id="findings-heading">What the evidence says</h2></div><p className="section-description">A matching quote shows only that the wording appears in retained source text. It does not show that the source supports a claim or applies to your case.</p>{!result.findings.length ? <p className="empty-note">No findings could be established from this research.</p> : <div className="findings-list">{result.findings.map((finding) => <article className="finding" key={finding.id}><div className="finding-labels"><span className={`finding-status ${finding.verified ? "source-backed" : "unsupported"}`}>{finding.verified ? "Wording found — meaning not verified" : "Supporting wording not found"}</span><span>AI interpretation (not verified): {finding.stance === "favors-customer" ? "favors you" : finding.stance === "favors-company" ? "favors the company" : "unclear"}</span></div><h3>{finding.statement}</h3>{finding.supportingPassage ? <blockquote>“{finding.supportingPassage}”</blockquote> : null}<p className="field-hint">{finding.verificationReason ?? "Claim relation and applicability have not been reviewed."}</p>{finding.sourceIds.length ? <div className="finding-sources">{finding.sourceIds.map((id) => sourceMap.has(id) ? <a key={id} href={`#source-${id}`}>[{id}] {sourceMap.get(id)?.title}</a> : <span key={id}>[{id}] Source unavailable</span>)}</div> : null}</article>)}</div>}</section>

            <section className="result-section" aria-labelledby="remedy-heading"><div className="section-title"><span className="section-number">03</span><h2 id="remedy-heading">The remedy to request</h2></div><p>{result.compensation.working || "No sourced compensation estimate could be established. State the remedy you want and ask the company to review it."}</p>{result.compensation.disputedAmount !== undefined ? <p className="amount-note"><strong>Disputed amount from your record:</strong> {result.compensation.disputedAmount} {"currency" in result.compensation ? String(result.compensation.currency ?? "") : ""}<br /><span>This is a charge in dispute, not an established entitlement to repayment.</span></p> : null}{!result.compensation.noAmountFound && result.compensation.amount !== undefined ? <p><strong>Sourced estimate:</strong> {result.compensation.amount} {"currency" in result.compensation ? String(result.compensation.currency ?? "") : ""}<br />{result.compensation.formula}{result.compensation.sourceId ? <> · <a href={`#source-${result.compensation.sourceId}`}>[{result.compensation.sourceId}]</a></> : null}</p> : null}</section>

            <section className="result-section letter-section" aria-labelledby="letter-heading"><div className="section-title"><span className="section-number">04</span><h2 id="letter-heading">Your complaint letter</h2></div>{isFictionalSample ? <p className="fictional-disclosure"><strong>Fictional demo.</strong> Do not send this example as a real complaint.</p> : null}<p className="section-description">Make it yours. Check facts, replace placeholders, and review each citation. Your edits are included in both exports; edits are not re-analyzed.</p><label htmlFor="complaint-letter" className="small-label">Editable letter</label><textarea id="complaint-letter" className="letter-editor" value={letter} onChange={(event) => { setLetter(event.target.value); onLetterChange?.(event.target.value); }} /><div className="letter-actions"><button className="primary-button" onClick={download}>Download .txt <span aria-hidden="true">↓</span></button><button className="secondary-button" onClick={() => window.print()}>Print / Save PDF</button></div><p className="field-hint">Printing includes only the current letter and its sources, not your document or full case analysis.</p>{citations.length ? <div className="citation-list"><h3>Letter sources</h3><ol>{citations.map((citation) => <li key={citation.id}>[{citation.id}] <SourceLink url={citation.url}>{citation.title}</SourceLink></li>)}</ol></div> : null}</section>

            <section className="result-section" aria-labelledby="escalation-heading"><div className="section-title"><span className="section-number">05</span><h2 id="escalation-heading">If the issue stays unresolved</h2></div><p className="section-description">Check that each option applies to your case. Unreviewed pack suggestions are starting points and may not be available for your dispute.</p>{result.escalation.length ? <ol className="escalation-list">{result.escalation.map((step) => <li key={step.step}><span className="escalation-number">{String(step.step).padStart(2, "0")}</span><div><h3>{step.body}</h3><p>{step.action}</p>{step.timing ? <p className="field-hint">Timing: {step.timing}</p> : null}<span className="status-label">{step.applicability === "supported" ? "Source-backed option" : "Verify applicability first"}</span>{step.sourceId && sourceMap.has(step.sourceId) ? <a className="escalation-source" href={`#source-${step.sourceId}`}>Source [{step.sourceId}]</a> : <p className="field-hint">No verified contact or deadline. Check the official website.</p>}</div></li>)}</ol> : <p className="empty-note">No applicable escalation route has been verified. Start with the company’s official support channel.</p>}</section>
          </div>

          <aside className="evidence-column" aria-labelledby="evidence-heading"><div className="evidence-heading"><p className="eyebrow">Open to inspection</p><h2 id="evidence-heading">The evidence file<span>{result.sources.length.toString().padStart(2, "0")}</span></h2><p>Read the source before relying on a claim. Search snippets may omit conditions or exceptions.</p></div>{result.sources.length ? <div className="sources-list">{result.sources.map((source) => <article className="source-card" key={source.id} id={`source-${source.id}`} tabIndex={-1}><div className="source-topline"><span>[{source.id}]</span><span>{source.kind ?? "Research source"}</span></div><h3><SourceLink url={source.url}>{source.title}</SourceLink></h3><p className="source-host">{safeUrl(source.url) ? new URL(source.url).hostname : "Unavailable source URL"}</p><dl className="source-review-status"><div><dt>Retrieved text</dt><dd>{sourceTextStatus(source)}</dd></div><div><dt>Source authority</dt><dd>{sourceAuthorityStatus(source.authority)}</dd></div><div><dt>Freshness</dt><dd>Unknown</dd></div><div><dt>Claim relation</dt><dd>Unreviewed</dd></div></dl><details className="source-excerpt"><summary>Read the retrieved text</summary><p className="source-snippet">{source.snippet}</p></details><p className="retrieved-at">Retrieved {source.retrievedAt}</p></article>)}</div> : <p className="empty-note">No sources were retrieved. Treat this analysis as incomplete.</p>}<details className="research-queries"><summary>Research queries</summary><ul>{result.queries.map((query, index) => <li key={index}>{query}</li>)}</ul></details></aside>
        </div>
        <div className="result-footer-note"><strong>Your next step is yours.</strong><p>Review the original documents and source material before sending. Fine Print Fighter provides information, not legal advice or representation.</p></div>
      </div>
      <article className="print-only" aria-label="Letter print copy">{isFictionalSample ? <p className="fictional-disclosure"><strong>FICTIONAL DEMO.</strong> The example consumer, company, and reply are invented. Research is live and does not establish company policy or eligibility.</p> : null}<pre>{letter}</pre>{citations.length ? <section><h2>Sources</h2>{citations.map((citation) => <p key={citation.id}>[{citation.id}] {citation.title}<br />{citation.url}</p>)}</section> : null}</article>
    </>
  );
}
