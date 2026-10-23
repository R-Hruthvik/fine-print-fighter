"use client";

import { useState } from "react";
import type { PipelineResult } from "@/lib/types";
import { COUNTRIES } from "@/lib/packs";
import { exportLetter, safeUrl } from "./workflow";

function SourceLink({ url, children }: { url: string; children: React.ReactNode }) {
  const href = safeUrl(url);
  return href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a> : <span>{children} (link unavailable)</span>;
}

function Notes({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div className="analysis-notes"><h3>{title}</h3><ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>;
}

export function CaseResult({ result, onReset }: { result: PipelineResult; onReset: () => void }) {
  const [letter, setLetter] = useState(result.letter);
  const sourceMap = new Map(result.sources.map((source) => [source.id, source]));
  const country = COUNTRIES.find((item) => item.code === result.country)?.label ?? "Selected jurisdiction";
  const unanswered = result.unanswered ?? [];
  const unverified = result.unverified ?? [];
  const conflicts = result.conflicts ?? [];
  const warnings = result.warnings ?? [];
  const citations = result.letterCitations.filter((citation) => safeUrl(citation.url));
  const noEvidence = !result.sources.length || result.score.coverage === "none";

  function download() {
    const blob = new Blob([exportLetter(letter, citations)], { type: "text/plain;charset=utf-8" });
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
      <div className="screen-only">
        <div className="results-title"><div><p className="eyebrow">Your case, organized</p><h1>Here’s where you stand.</h1><p>Research scope: {country}. Review the evidence and fill any gaps before taking action.</p></div><button className="secondary-button" onClick={onReset}>Start a new case <span aria-hidden="true">↗</span></button></div>
        <div className="results-layout">
          <div className="results-primary">
            <section className="strength-panel" aria-labelledby="strength-heading"><div className="strength-topline"><p className="eyebrow">Evidence assessment</p><span className="status-label">{noEvidence ? "Insufficient evidence" : `${result.score.coverage ?? "limited"} coverage`}</span></div><h2 id="strength-heading">{noEvidence ? "More evidence is needed." : `${result.score.rating[0].toUpperCase()}${result.score.rating.slice(1)} support for your case.`}</h2><ul>{result.score.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul><p className="assessment-note">This rating describes available evidence. It does not predict a legal outcome.</p>{result.score.evidenceToGather.length ? <div className="gather-evidence"><h3>What to gather next</h3><ul>{result.score.evidenceToGather.map((item, index) => <li key={index}>{item}</li>)}</ul></div> : null}</section>

            {unanswered.length || unverified.length || conflicts.length || warnings.length ? <section className="result-section limitations-section" aria-labelledby="limitations-heading"><p className="eyebrow">Read before acting</p><h2 id="limitations-heading">What we couldn’t establish</h2><Notes title="Research limitations" items={warnings} /><Notes title="Unanswered questions" items={unanswered} /><Notes title="Conflicting evidence" items={conflicts} /><Notes title="Unsupported possibilities" items={unverified} /></section> : null}

            <section className="result-section" aria-labelledby="facts-heading"><div className="section-title"><span className="section-number">01</span><h2 id="facts-heading">The facts from your document</h2></div><p className="section-description">Check these against the original. These are extracted statements, not independently confirmed facts.</p><dl className="facts-list">{Object.entries(result.facts).map(([key, value]) => <div key={key}><dt>{key.replace(/([a-z])([A-Z])/g, "$1 $2")}</dt><dd>{Array.isArray(value) ? value.length ? value.join(" · ") : "Not stated" : String(value ?? "Not stated")}</dd></div>)}</dl></section>

            <section className="result-section" aria-labelledby="findings-heading"><div className="section-title"><span className="section-number">02</span><h2 id="findings-heading">What the evidence says</h2></div><p className="section-description">Source-backed means a supporting passage was traced. Applicability to your circumstances may still need review.</p>{!result.findings.length ? <p className="empty-note">No supported findings could be established from this research.</p> : <div className="findings-list">{result.findings.map((finding) => <article className="finding" key={finding.id}><div className="finding-labels"><span className={`finding-status ${finding.verified ? "source-backed" : "unsupported"}`}>{finding.verified ? "Source-backed" : "Unverified"}</span><span>{finding.stance === "favors-customer" ? "Supports your position" : finding.stance === "favors-company" ? "Supports the company" : "Unclear"}</span></div><h3>{finding.statement}</h3>{finding.supportingPassage ? <blockquote>“{finding.supportingPassage}”</blockquote> : null}<p className="field-hint">Applicability: {finding.applicability === "supported" ? "Supported by the supplied evidence" : "Needs review for your circumstances"}{finding.verificationReason ? ` · ${finding.verificationReason}` : ""}</p>{finding.sourceIds.length ? <div className="finding-sources">{finding.sourceIds.map((id) => sourceMap.has(id) ? <a key={id} href={`#source-${id}`}>[{id}] {sourceMap.get(id)?.title}</a> : <span key={id}>[{id}] Source unavailable</span>)}</div> : null}</article>)}</div>}</section>

            <section className="result-section" aria-labelledby="remedy-heading"><div className="section-title"><span className="section-number">03</span><h2 id="remedy-heading">The remedy to request</h2></div><p>{result.compensation.working || "No sourced compensation estimate could be established. State the remedy you want and ask the company to review it."}</p>{result.compensation.disputedAmount !== undefined ? <p className="amount-note"><strong>Documented disputed amount:</strong> {result.compensation.disputedAmount} {"currency" in result.compensation ? String(result.compensation.currency ?? "") : ""}<br /><span>This is a charge in dispute, not an established entitlement to repayment.</span></p> : null}{!result.compensation.noAmountFound && result.compensation.amount !== undefined ? <p><strong>Sourced estimate:</strong> {result.compensation.amount} {"currency" in result.compensation ? String(result.compensation.currency ?? "") : ""}<br />{result.compensation.formula}{result.compensation.sourceId ? <> · <a href={`#source-${result.compensation.sourceId}`}>[{result.compensation.sourceId}]</a></> : null}</p> : null}</section>

            <section className="result-section letter-section" aria-labelledby="letter-heading"><div className="section-title"><span className="section-number">04</span><h2 id="letter-heading">Your complaint letter</h2></div><p className="section-description">Make it yours. Check facts, replace placeholders, and review each citation. Your edits are included in both exports; edits are not re-analyzed.</p><label htmlFor="complaint-letter" className="small-label">Editable letter</label><textarea id="complaint-letter" className="letter-editor" value={letter} onChange={(event) => setLetter(event.target.value)} /><div className="letter-actions"><button className="primary-button" onClick={download}>Download .txt <span aria-hidden="true">↓</span></button><button className="secondary-button" onClick={() => window.print()}>Print / Save PDF</button></div><p className="field-hint">Printing includes only the current letter and its sources, not your document or full case analysis.</p>{citations.length ? <div className="citation-list"><h3>Letter sources</h3><ol>{citations.map((citation) => <li key={citation.id}>[{citation.id}] <SourceLink url={citation.url}>{citation.title}</SourceLink></li>)}</ol></div> : null}</section>

            <section className="result-section" aria-labelledby="escalation-heading"><div className="section-title"><span className="section-number">05</span><h2 id="escalation-heading">If the issue stays unresolved</h2></div><p className="section-description">Check that each option applies to your case. Unreviewed pack suggestions are starting points and may not be available for your dispute.</p>{result.escalation.length ? <ol className="escalation-list">{result.escalation.map((step) => <li key={step.step}><span className="escalation-number">{String(step.step).padStart(2, "0")}</span><div><h3>{step.body}</h3><p>{step.action}</p>{step.timing ? <p className="field-hint">Timing: {step.timing}</p> : null}<span className="status-label">{step.applicability === "supported" ? "Source-backed option" : "Verify applicability first"}</span>{step.sourceId && sourceMap.has(step.sourceId) ? <a className="escalation-source" href={`#source-${step.sourceId}`}>Source [{step.sourceId}]</a> : <p className="field-hint">No verified contact or deadline. Check the official website.</p>}</div></li>)}</ol> : <p className="empty-note">No applicable escalation route has been verified. Start with the company’s official support channel.</p>}</section>
          </div>

          <aside className="evidence-column" aria-labelledby="evidence-heading"><div className="evidence-heading"><p className="eyebrow">Open to inspection</p><h2 id="evidence-heading">The evidence file<span>{result.sources.length.toString().padStart(2, "0")}</span></h2><p>Read the source before relying on a claim. Search snippets may omit conditions or exceptions.</p></div>{result.sources.length ? <div className="sources-list">{result.sources.map((source) => <article className="source-card" key={source.id} id={`source-${source.id}`} tabIndex={-1}><div className="source-topline"><span>[{source.id}]</span><span>{source.kind ?? "Research source"}</span></div><h3><SourceLink url={source.url}>{source.title}</SourceLink></h3><p className="source-host">{safeUrl(source.url) ? new URL(source.url).hostname : "Unavailable source URL"}</p><p className="source-snippet">{source.snippet}</p><p className="retrieved-at">Retrieved {source.retrievedAt}</p></article>)}</div> : <p className="empty-note">No sources were retrieved. Treat this analysis as incomplete.</p>}<details className="research-queries"><summary>Research queries</summary><ul>{result.queries.map((query, index) => <li key={index}>{query}</li>)}</ul></details></aside>
        </div>
        <div className="result-footer-note"><strong>Your next step is yours.</strong><p>Review the original documents and source material before sending. Fine Print Fighter provides information, not legal advice or representation.</p></div>
      </div>
      <article className="print-only" aria-label="Letter print copy"><pre>{letter}</pre>{citations.length ? <section><h2>Sources</h2>{citations.map((citation) => <p key={citation.id}>[{citation.id}] {citation.title}<br />{citation.url}</p>)}</section> : null}</article>
    </>
  );
}
