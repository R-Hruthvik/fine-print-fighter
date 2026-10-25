import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell, PageIntro } from "@/components/SiteShell";
import { SavedCaseControls } from "@/components/SavedCaseControls";
import { createClient } from "@/lib/supabase/server";
import { jurisdictionLabel, packLabel } from "@/lib/catalog";
import type { SavedCaseDetail } from "@/lib/saved-cases";
import { Suspense } from "react";

type Props = { params: Promise<{ caseId: string }> };

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
  return <SiteShell><div className="page-container cases-page case-detail-page">
    <Link href="/cases" className="back-link">← All saved cases</Link>
    <PageIntro eyebrow={`${packLabel(saved.pack_id)} · ${jurisdictionLabel(saved.jurisdiction)}`} title={saved.company_name} body={`Saved ${new Date(saved.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · Last updated ${new Date(saved.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`} />
    <SavedCaseControls caseId={saved.id} />
    {analysis && typeof analysis === "object" ? <>
      <section className="saved-analysis-section"><div className="section-title-block"><span className="section-number">01</span><h2>Analysis snapshot</h2></div><div className="saved-analysis-topline"><span className="status-label">{analysis.score?.rating ?? "Review"} assessment</span><span>{analysis.score?.coverage ?? "unknown"} evidence coverage</span></div><p>{analysis.compensation?.working ?? "Review the source material and facts before relying on this assessment."}</p>{analysis.score?.reasons?.length ? <ul>{analysis.score.reasons.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : null}{analysis.warnings?.length ? <div className="saved-case-warnings"><strong>Limits to review</strong><ul>{analysis.warnings.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div> : null}</section>
      <section className="saved-analysis-section"><div className="section-title-block"><span className="section-number">02</span><h2>Findings</h2></div>{analysis.findings?.length ? <ol className="saved-findings">{analysis.findings.map((finding, index) => <li key={finding.id ?? index}><strong>{finding.statement}</strong><p>{finding.supportingPassage || "No supporting passage was recorded."}</p><span className="field-hint">{finding.verified ? "Source-backed" : "Unverified"} · {finding.applicability === "supported" ? "Applicability supported" : "Applicability needs review"}</span></li>)}</ol> : <p>No findings were recorded in this analysis.</p>}</section>
      <section className="saved-analysis-section"><div className="section-title-block"><span className="section-number">03</span><h2>Complaint letter</h2></div><pre className="saved-letter">{saved.letter}</pre></section>
    </> : <div className="case-state"><h2>Analysis data is unavailable</h2><p>The saved record does not contain a readable analysis result.</p></div>}
    <section className="saved-analysis-section saved-documents"><div className="section-title-block"><span className="section-number">04</span><h2>Original documents</h2></div>{documents.length ? documents.map((document, index) => <details className="saved-document" key={`${document.label}-${index}`}><summary>{document.label}</summary><pre>{document.text}</pre></details>) : <p>No original documents were saved with this case.</p>}<p className="privacy-note">These documents are private to your account. Fine Print Fighter does not send letters, file complaints, or contact companies for you.</p></section>
  </div></SiteShell>;
}
