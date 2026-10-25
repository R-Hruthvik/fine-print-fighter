import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell, PageIntro } from "@/components/SiteShell";
import { COMPANIES, jurisdictionLabel, packLabel } from "@/lib/catalog";

export function generateStaticParams() { return COMPANIES.map((company) => ({ slug: company.slug })); }

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = COMPANIES.find((entry) => entry.slug === slug);
  if (!company) notFound();
  return <SiteShell><div className="content-wrap">
    <div className="backline"><Link href="/companies">← Company directory</Link></div>
    <PageIntro eyebrow={company.officialDomain} title={company.name} body={company.summary} />
    <div className="coverage-facts"><div><span className="small-label">Complaint types with recorded sources</span><p>{company.packIds.map(packLabel).join(" · ")}</p></div><div><span className="small-label">Jurisdictions in this entry</span><p>{company.jurisdictions.map(jurisdictionLabel).join(" · ")}</p></div><div><span className="small-label">Last source review</span><p>{company.reviewedOn}</p></div></div>
    <section className="source-section"><p className="eyebrow">Primary material</p><h2>Sources to inspect</h2><p>These links point to official company pages. Their contents may change; review the current material and the facts of your own case.</p><ol className="source-list">{company.sourceUrls.map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{new URL(url).hostname}{new URL(url).pathname.replaceAll("/", " / ")} <span aria-hidden="true">↗</span></a></li>)}</ol></section>
    <aside className="jurisdiction-note"><h2>Coverage is a starting point.</h2><p>A company listing means relevant material was recorded for research. It does not confirm that any specific consumer rule applies, establish eligibility, or guarantee a remedy. Your route, account, contract, location, and other facts may matter.</p></aside>
    <div className="closing-cta"><h2>Review your own documents.</h2><p>You can select {company.name} in the guided complaint flow. The company is not contacted and nothing is submitted on your behalf.</p><Link className="primary-button" href="/complaints/new">Start a complaint <span aria-hidden="true">→</span></Link></div>
  </div></SiteShell>;
}
