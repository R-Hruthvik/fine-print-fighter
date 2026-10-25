import Link from "next/link";
import { SiteShell, PageIntro } from "@/components/SiteShell";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { jurisdictionLabel, packLabel } from "@/lib/catalog";
import { CaseDeleteButton } from "@/components/SavedCaseControls";

export default function CasesPage() {
  return <Suspense fallback={<SiteShell><div className="page-container cases-page"><PageIntro eyebrow="Your case file" title="Saved cases" body="Loading your private cases…" /></div></SiteShell>}><CasesContent /></Suspense>;
}

async function CasesContent() {
  let supabase;
  try { supabase = await createClient(); } catch {
    return <SiteShell><div className="page-container cases-page"><PageIntro eyebrow="Your case file" title="Saved cases" body="Sign in to keep a private record of your analysis and return to it later." /><div className="case-state"><h2>Private storage is not connected yet</h2><p>Saved cases become available after the site is connected to its Supabase project.</p><Link className="primary-button" href="/sign-in">Sign in</Link></div></div></SiteShell>;
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return <SiteShell><div className="page-container cases-page"><PageIntro eyebrow="Your case file" title="Saved cases" body="Your saved cases are private to your account. Sign in to review them." /><div className="case-state"><h2>Sign in to see your cases</h2><p>Guest analysis is available without an account. Saving a complete case is always optional.</p><Link className="primary-button" href="/sign-in?next=%2Fcases">Sign in</Link><Link className="text-link" href="/complaints/new">Start a guest analysis <span aria-hidden="true">→</span></Link></div></div></SiteShell>;
  const { data, error } = await supabase.from("cases").select("id, company_name, pack_id, jurisdiction, created_at, updated_at").order("updated_at", { ascending: false });
  return <SiteShell><div className="page-container cases-page"><PageIntro eyebrow="Your case file" title="Saved cases" body="Private records you chose to save. Open one to review its evidence and analysis." />
    {error ? <div className="case-state" role="alert"><h2>Cases could not be loaded</h2><p>Check that the database migration is applied, then try again.</p></div> : !data?.length ? <div className="case-state"><span className="document-mark" aria-hidden="true">Aa</span><h2>No saved cases yet</h2><p>Analyze a complaint and choose to save the complete case when you are ready.</p><Link className="primary-button" href="/complaints/new">Start a complaint <span aria-hidden="true">→</span></Link></div> : <section className="case-list" aria-label="Saved cases">{data.map((item) => <article className="case-list-item" key={item.id}><Link href={`/cases/${item.id}`} className="case-list-main"><span className="case-list-index">{new Date(item.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span><span className="case-list-title">{item.company_name}</span><span className="case-list-meta">{packLabel(item.pack_id)} · {jurisdictionLabel(item.jurisdiction)}</span></Link><div className="case-list-actions"><Link href={`/cases/${item.id}`} className="text-link">Review <span aria-hidden="true">↗</span></Link><CaseDeleteButton caseId={item.id} compact /></div></article>)}</section>}
    <p className="privacy-note cases-privacy">Saving stores the original documents and analysis in your private account. You can export or delete a saved case at any time.</p>
  </div></SiteShell>;
}
