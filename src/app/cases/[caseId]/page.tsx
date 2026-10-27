import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SiteShell, PageIntro } from "@/components/SiteShell";
import { SavedCaseControls } from "@/components/SavedCaseControls";
import { createClient } from "@/lib/supabase/server";
import { jurisdictionLabel, packLabel } from "@/lib/catalog";
import type { SavedCaseDetail } from "@/lib/saved-cases";
import type { PipelineResult, Source } from "@/lib/types";

type Props = { params: Promise<{ caseId: string }> };
type SavedAnalysisRun = { id: string; analysis: PipelineResult; letter: string; created_at: string };

export default function SavedCasePage({ params }: Props) {
  return <Suspense fallback={<SiteShell><div className="page-container cases-page"><PageIntro eyebrow="Saved case" title="Private case review" body="Loading your saved case…" /></div></SiteShell>}><SavedCaseContent params={params} /></Suspense>;
}

async function SavedCaseContent({ params }: Props) {
  const { caseId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(caseId)) notFound();
  let supabase;
  try { supabase = await createClient(); } catch {
    return <SiteShell><div className="page-container cases-page"><PageIntro eyebrow="Saved case" title="Private case review" body="Saved case storage has not been connected on this site." /><div className="case-state"><p>Connect the Supabase project to access private case records.</p><Link className="text-link" href="/cases">Back to cases</Link></div></div></SiteShell>;
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return <SiteShell><div className="page-container cases-page"><PageIntro eyebrow="Saved case" title="Sign in to review this case" body="Only the account that saved this case can access its documents and analysis." /><div className="case-state"><Link className="primary-button" href={`/sign-in?next=${encodeURIComponent(`/cases/${caseId}`)}`}>Sign in</Link><Link className="text-link" href="/cases">Back to cases</Link></div></div></SiteShell>;
  const { data, error } = await supabase.from("cases").select("id, company_name, pack_id, jurisdiction, documents, analysis, letter, created_at, updated_at").eq("id", caseId).maybeSingle();
  if (!data && !error) notFound();
  if (error || !data) return <SiteShell><div className="page-container cases-page"><div className="case-state"><h1>Case unavailable</h1><p>This case could not be opened. It may have been deleted or the database is not ready.</p><Link className="text-link" href="/cases">Return to your cases</Link></div></div></SiteShell>;
  const saved = data as unknown as SavedCaseDetail;
  const analysis = saved.analysis;
  const documents = Array.isArray(saved.documents) ? saved.documents : [];
  const sources = Array.isArray(analysis?.sources) ? analysis.sources : [];
  const findings = Array.isArray(analysis?.findings) ? analysis.findings : [];
  const { data: runRows, error: historyError } = await supabase.from("analysis_runs").select("id, analysis, letter, created_at").eq("case_id", caseId).order("created_at", { ascending: false }).limit(20);
  const history = (runRows ?? []) as unknown as SavedAnalysisRun[];

  return <SiteShell><div className="page-container cases-page case-detail-page">
    <Link href="/cases" className="back-link">← All saved cases</Link>
    <PageIntro eyebrow={`${packLabel(saved.pack_id)} · ${jurisdictionLabel(saved.jurisdiction)}`} title={saved.company_name} body={`Saved ${formatDate(saved.created_at)} · Last updated ${formatDate(saved.updated_at)}.`} />
    <SavedCaseControls caseId={saved.id} />
    {analysis && typeof analysis === "object" ? <>
      <section className="saved-analysis-section"><SectionTitle number="01" title="Analysis snapshot" /><div className="saved-analysis-topline"><span className="status-label">{analysis.score?.rating ?? "Review"} evidence assessment</span><span>{analysis.score?.coverage ?? "unknown"} evidence coverage</span><span>Run {analysis.run?.startedAt ? formatDate(analysis.run.startedAt) : "date unavailable"}</span></div><p>{analysis.compensation?.working ?? "Review the source material and facts before relying on this assessment."}</p>{analysis.score?.reasons?.length ? <ul>{analysis.score.reasons.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : null}{analysis.warnings?.length ? <div className="saved-case-warnings"><strong>Limits to review</strong><ul>{analysis.warnings.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div> : null}</section>

      <section className="saved-analysis-section"><SectionTitle number="02" title="Extracted facts and document evidence" /><p>These are details found in the submitted documents. A matching excerpt shows where the detail appeared; it does not independently confirm that the statement is true.</p>{Object.entries(analysis.facts ?? {}).map(([key, value]) => {
        const evidence = analysis.factEvidence?.[key];
        return <article className="saved-evidence-item" key={key}><h3>{humanize(key)}</h3><p>{formatValue(value)}</p>{evidence ? <div className="saved-fact-provenance"><span className="field-hint">Excerpt from {evidence.label || "submitted document"}</span>{evidence.excerpts.map((excerpt, index) => <blockquote key={`${index}-${excerpt}`}>{excerpt}</blockquote>)}</div> : <span className="field-hint">No document excerpt was recorded for this detail.</span>}</article>;
      })}{Object.keys(analysis.facts ?? {}).length === 0 ? <p>No facts were extracted for this analysis.</p> : null}{analysis.scopeAnswers?.answers.length ? <div className="saved-evidence-item"><h3>User-entered scope answers</h3><p>These are kept separate from document-extracted facts. They are user statements and have not been corroborated or used to determine eligibility.</p><dl className="saved-case-meta">{analysis.scopeAnswers.answers.map((answer) => <div key={answer.key}><dt>{answer.label}</dt><dd>{answer.value ?? "Not provided"}<span className="field-hint"> · {answer.provenance === "user_answer" ? "Your answer" : "Unknown provenance"}</span></dd></div>)}</dl></div> : null}</section>

      <section className="saved-analysis-section"><SectionTitle number="03" title="Findings and cited passages" />{findings.length ? <ol className="saved-findings">{findings.map((finding, index) => <li key={finding.id ?? index}><strong>{finding.statement}</strong><p>{finding.supportingPassage || "No supporting passage was recorded."}</p><span className="field-hint">{finding.verified ? "Exact passage matched in retrieved text" : "Passage not verified"} · {finding.applicability === "supported" ? "Scope appears supported" : "Applicability needs review"}</span>{finding.verificationReason ? <p className="field-hint">{finding.verificationReason}</p> : null}{finding.sourceIds?.length ? <ul className="source-reference-list">{finding.sourceIds.map((sourceId) => <li key={sourceId}><a href={`#source-${encodeURIComponent(sourceId)}`}>Source {sourceId}: {sources.find((source) => source.id === sourceId)?.title ?? "source details"}</a></li>)}</ul> : <p className="field-hint">No source was attached to this finding.</p>}</li>)}</ol> : <p>No findings were recorded in this analysis.</p>}</section>

      <section className="saved-analysis-section"><SectionTitle number="04" title="Research sources" /><p>Retrieved sources are leads for review. A matched passage does not by itself establish that a source is authoritative or applies to this case.</p>{sources.length ? <ol className="saved-source-list">{sources.map((source: Source, index) => <li id={`source-${source.id}`} key={source.id}><div className="saved-source-heading"><span className="case-list-index">Source {index + 1} · {source.kind ?? "unclassified source"}</span><a href={safeHttpUrl(source.url) ?? undefined} target="_blank" rel="noreferrer">{source.title || source.url} ↗</a></div><p>{source.snippet || "No excerpt was retained."}</p><div className="field-hint">Retrieved {formatDate(source.retrievedAt)}{source.queries?.length ? ` · Search: ${source.queries.join("; ")}` : ""}</div><dl className="source-review-status saved-source-review-status"><div><dt>Retrieved text</dt><dd>{source.retrieval === "provider_extract" && source.extractionStatus === "extracted" ? "Page text extracted" : source.extractionStatus === "failed" ? "Search snippet fallback · page extraction failed" : source.extractionStatus === "skipped_no_key" ? "Search snippet · extraction skipped" : source.extractionStatus === "not_selected" ? "Search snippet · not selected for extraction" : "Search snippet only"}</dd></div><div><dt>Publisher</dt><dd>{source.authority === "regulator" ? "Official regulator page in reviewed source list" : source.authority === "official_company" ? "Official company domain in reviewed directory" : source.authority === "official_explainer" ? "Official explainer in reviewed source list" : "Unreviewed publisher"}</dd></div><div><dt>Freshness</dt><dd>Unknown</dd></div><div><dt>Claim relation</dt><dd>Unreviewed</dd></div></dl></li>)}</ol> : <p>No research sources were recorded in this analysis.</p>}{analysis.letterCitations?.length ? <div className="saved-citations"><h3>References in the draft</h3><ol>{analysis.letterCitations.map((citation) => <li key={`${citation.id}-${citation.url}`}><a href={safeHttpUrl(citation.url) ?? undefined} target="_blank" rel="noreferrer">{citation.title}</a></li>)}</ol></div> : null}</section>

      <section className="saved-analysis-section"><SectionTitle number="05" title="Remedy and escalation" /><h3>Remedy estimate</h3><p>{analysis.compensation?.working || "No remedy estimate was recorded."}</p>{analysis.compensation?.formula ? <p><strong>Calculation:</strong> {analysis.compensation.formula}</p> : null}{analysis.compensation?.amount !== undefined ? <p><strong>Amount:</strong> {analysis.compensation.currency ?? ""} {analysis.compensation.amount}</p> : null}{analysis.compensation?.disputedAmount !== undefined ? <p><strong>Disputed amount found in documents:</strong> {analysis.compensation.disputedAmount}</p> : null}{analysis.compensation?.noAmountFound ? <p>No amount was identified from the available information.</p> : null}<h3>Possible next steps</h3>{analysis.escalation?.length ? <ol className="saved-escalation-list">{analysis.escalation.map((step) => <li key={`${step.step}-${step.body}`}><strong>Step {step.step}: {step.action}</strong><p>{step.body}</p><span className="field-hint">{step.provenance === "source" ? "Source-linked suggestion" : "General suggestion"} · {step.applicability === "supported" ? "scope reviewed" : "check whether this applies"}{step.timing ? ` · ${step.timing}` : ""}</span>{step.sourceId ? <p><a href={`#source-${encodeURIComponent(step.sourceId)}`}>Review source {step.sourceId}</a></p> : null}</li>)}</ol> : <p>No escalation suggestions were recorded.</p>}</section>

      <section className="saved-analysis-section"><SectionTitle number="06" title="Open questions and conflicts" />{analysis.unanswered?.length || analysis.score?.evidenceToGather?.length ? <><h3>Information that could help</h3><ul>{unique([...(analysis.unanswered ?? []), ...(analysis.score?.evidenceToGather ?? [])]).map((item) => <li key={item}>{item}</li>)}</ul></> : <p>No unanswered questions were recorded.</p>}{analysis.unverified?.length ? <><h3>Unverified details</h3><ul>{analysis.unverified.map((item) => <li key={item}>{item}</li>)}</ul></> : null}{analysis.conflicts?.length ? <div className="saved-case-warnings"><strong>Conflicting details to resolve</strong><ul>{analysis.conflicts.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}{analysis.rebuttalLab?.objections?.length ? <><h3>Possible company responses considered</h3><ul className="saved-objections">{analysis.rebuttalLab.objections.map((objection) => <li key={objection.id}><strong>{objection.hypothesis}</strong><p>{objection.status.replaceAll("-", " ")}{objection.supportingPassage ? ` · ${objection.supportingPassage}` : ""}</p>{objection.evidenceNeeded.length ? <span className="field-hint">Evidence that may help: {objection.evidenceNeeded.join("; ")}</span> : null}</li>)}</ul></> : null}</section>

      <section className="saved-analysis-section"><SectionTitle number="07" title="Complaint letter draft" /><p>This is a draft for you to review and edit before deciding what to do.</p><pre className="saved-letter">{saved.letter}</pre></section>
    </> : <div className="case-state"><h2>Analysis data is unavailable</h2><p>The saved record does not contain a readable analysis result.</p></div>}

    <section className="saved-analysis-section saved-documents"><SectionTitle number="08" title="Original documents" />{documents.length ? documents.map((document, index) => <details className="saved-document" key={`${document.label}-${index}`}><summary>{document.label}</summary><pre>{document.text}</pre></details>) : <p>No original documents were saved with this case.</p>}<p className="privacy-note">These documents are private to your account. Fine Print Fighter does not send letters, file complaints, or contact companies for you.</p></section>

    <section className="saved-analysis-section"><SectionTitle number="09" title="Previous analysis runs" /><p>Reanalysis keeps the prior result and its letter draft here. The newest result appears above.</p>{historyError ? <p className="feedback notice-feedback">Analysis history is not available yet. Apply the private analysis history migration to enable it.</p> : history.length ? <ol className="saved-run-history">{history.map((run) => <li key={run.id}><details><summary>{run.analysis.run?.startedAt ? formatDate(run.analysis.run.startedAt) : formatDate(run.created_at)} · {run.analysis.score?.rating ?? "Review"} evidence assessment</summary><p>{run.analysis.compensation?.working ?? "No remedy summary was recorded."}</p><p>{run.analysis.findings?.length ?? 0} findings · {run.analysis.sources?.length ?? 0} sources · {run.analysis.score?.coverage ?? "unknown"} coverage</p><h3>Previous letter draft</h3><pre className="saved-letter">{run.letter}</pre></details></li>)}</ol> : <p>No previous runs are stored yet. The first reanalysis will preserve the current result here.</p>}</section>
  </div></SiteShell>;
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return <div className="section-title-block"><span className="section-number">{number}</span><h2>{title}</h2></div>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "date unavailable" : date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "Not stated";
  if (Array.isArray(value)) return value.length ? value.join(" · ") : "None recorded";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll(/[-_]/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch { return null; }
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
