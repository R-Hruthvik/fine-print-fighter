import Link from "next/link";
import { SiteShell, PageIntro } from "@/components/SiteShell";
import { GUIDES, packLabel } from "@/lib/catalog";

export default function GuidesPage() {
  return <SiteShell><div className="content-wrap">
    <PageIntro eyebrow="Practical guides" title="Make the record easier to review." body="Short, document-first guides for organizing a billing or service complaint. They help you prepare evidence; they do not determine legal rights." />
    <div className="editorial-list">{GUIDES.map((guide, index) => <article className="editorial-row" key={guide.slug}><span className="row-index">0{index + 1}</span><div><p className="small-label">{packLabel(guide.packId)}</p><h2><Link href={`/guides/${guide.slug}`}>{guide.title}</Link></h2><p>{guide.summary}</p></div><Link className="row-arrow" href={`/guides/${guide.slug}`} aria-label={`Read ${guide.title}`}>↗</Link></article>)}</div>
    <section className="unlisted-note"><h2>Keep private details out when possible.</h2><p>Use only the information needed to explain the issue. You can replace account numbers, addresses, and other identifying details before analysis.</p></section>
  </div></SiteShell>;
}
