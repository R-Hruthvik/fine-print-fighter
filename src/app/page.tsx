import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { EvidenceWalkthrough } from "@/components/EvidenceWalkthrough";
import { CASE_TYPES, COUNTRIES } from "@/lib/packs";
import { COMPANIES, GUIDES, packLabel } from "@/lib/catalog";

export default function Home() {
  return <SiteShell>
    <div className="home-page">
      <section className="home-hero content-container">
        <div className="hero-copy">
          <p className="eyebrow">Facts first. Your voice next.</p>
          <h1>Make the fine print<br />make sense.</h1>
          <p className="hero-lede">Bring the bill, notice, or reply. Get a grounded read of the evidence, the questions still open, and a response you can edit.</p>
          <div className="hero-actions"><Link className="primary-button" href="/complaints/new">Start a complaint <span aria-hidden="true">→</span></Link><a className="secondary-button" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a></div>
          <p className="hero-footnote">Free to analyze · No letters sent or complaints filed for you</p>
        </div>
        <div className="hero-document" aria-label="Example evidence review preview">
          <div className="document-topline"><span>CASE NOTE / SAMPLE 014</span><span>FICTIONAL</span></div>
          <p className="document-heading">A cancellation that may not have gone through.</p>
          <div className="document-excerpt"><span>EXHIBIT A · COMPANY EMAIL</span><p>“Your request has been received. Our billing team will review it.”</p></div>
          <div className="document-line"><span>Evidence found</span><strong>Request received</strong></div>
          <div className="document-line"><span>Still to confirm</span><strong>Cancellation date</strong></div>
          <div className="document-stamp">REVIEW<br />THE SOURCE</div>
          <p className="document-caption">A sample preview. A matching document is a fact to review, not a promise of an outcome.</p>
        </div>
      </section>

      <section className="trust-strip"><div className="content-container trust-items"><span>Start with your own documents</span><span>See sources and evidence gaps</span><span>Choose what happens next</span></div></section>

      <section className="home-section content-container" id="how-it-works" data-reveal>
        <div className="section-intro"><p className="eyebrow">A careful second look</p><h2>From a confusing reply<br />to a clearer next step.</h2><p>Fine Print Fighter helps organize what happened and what the company said. You stay in charge of every decision.</p></div>
        <ol className="home-steps"><li><span>01</span><div><h3>Bring the record</h3><p>Paste a bill, cancellation notice, itinerary, or company response.</p></div></li><li><span>02</span><div><h3>Inspect the evidence</h3><p>Review cited material, what it supports, and what remains uncertain.</p></div></li><li><span>03</span><div><h3>Decide what to do</h3><p>Edit a draft, gather more documents, or leave the analysis here.</p></div></li></ol>
      </section>

      <section className="home-section categories-section" data-reveal>
        <div className="content-container"><div className="section-heading-row"><div><p className="eyebrow">Complaint types</p><h2>Start with the shape of the problem.</h2></div><Link href="/complaints">All complaint guides <span aria-hidden="true">↗</span></Link></div>
          <div className="category-list">{CASE_TYPES.map((pack, index) => <Link key={pack.id} href={`/complaints/${pack.id}`} className="category-row"><span className="category-index">0{index + 1}</span><span className="category-title">{pack.label}</span><span className="category-detail">{pack.id === "flight-delay" ? "Delays, cancellations, missed connections" : pack.id === "subscription-cancel" ? "Cancellations, renewals, recurring charges" : "Unexpected out-of-network or medical charges"}</span><span className="category-arrow" aria-hidden="true">↗</span></Link>)}</div>
        </div>
      </section>

      <section className="home-section content-container evidence-section" data-reveal>
        <div className="evidence-pitch"><p className="eyebrow">Try it offline</p><h2>See what a piece of evidence can change.</h2><p>Change the fictional exhibit below. The result updates on your device; no model or research calls happen in this walkthrough.</p><Link className="text-link" href="/complaints/new">Use your own documents <span aria-hidden="true">→</span></Link></div>
        <EvidenceWalkthrough />
      </section>

      <section className="home-section features-section" data-reveal>
        <div className="content-container"><p className="eyebrow">Built for review</p><h2>Useful tools. Clear limits.</h2><div className="feature-columns"><article><span className="feature-mark">01</span><h3>Evidence, with its source</h3><p>Inspect the supporting passage and original source links. A claim is only as useful as the material behind it.</p></article><article><span className="feature-mark">02</span><h3>A draft you control</h3><p>Get a response draft to edit, copy, or ignore. Fine Print Fighter never sends it for you.</p></article><article><span className="feature-mark">03</span><h3>More context when needed</h3><p>Review the company’s explanation and add exhibits for another analysis pass.</p></article></div></div>
      </section>

      <section className="home-section content-container coverage-section" data-reveal>
        <div className="section-heading-row"><div><p className="eyebrow">Coverage notes</p><h2>Research starts in three jurisdictions.</h2><p>Company-specific source coverage is limited and reviewed. Unlisted companies can still be analyzed from your documents, but company-specific research may be limited.</p></div><Link href="/companies">Browse companies <span aria-hidden="true">↗</span></Link></div>
        <div className="coverage-meta"><div><span className="small-label">Jurisdictions</span><p>{COUNTRIES.map((country) => country.label).join(" · ")}</p></div><div><span className="small-label">Company entries</span><p>{COMPANIES.map((company) => company.name).join(" · ")}</p></div><div><span className="small-label">Complaint packs</span><p>{CASE_TYPES.map((pack) => pack.label).join(" · ")}</p></div></div>
        <div className="coverage-mini-list">{COMPANIES.map((company) => <Link key={company.slug} href={`/companies/${company.slug}`}><span>{company.name}</span><span>{company.packIds.map(packLabel).join(" · ")}</span><span aria-hidden="true">↗</span></Link>)}</div>
      </section>

      <section className="home-section guides-section" data-reveal>
        <div className="content-container"><div className="section-heading-row"><div><p className="eyebrow">Before you begin</p><h2>Small steps for a stronger record.</h2></div><Link href="/guides">All guides <span aria-hidden="true">↗</span></Link></div><div className="guide-lines">{GUIDES.map((guide, i) => <Link key={guide.slug} href={`/guides/${guide.slug}`}><span className="guide-index">0{i + 1}</span><span><strong>{guide.title}</strong><small>{guide.summary}</small></span><span aria-hidden="true">→</span></Link>)}</div></div>
      </section>

      <section className="privacy-band" data-reveal><div className="content-container privacy-layout"><div><p className="eyebrow">Privacy and limits</p><h2>Your case stays yours to share.</h2></div><div><p>Guest analysis is not saved to a case library. Analysis text is sent to the configured model provider, and minimized research queries may go to the search provider. Review the privacy notes before sharing sensitive material.</p><p>Analysis is informational, can be incomplete, and does not establish eligibility or replace legal advice. You decide whether to use a draft.</p><Link href="/profile">Account and privacy options <span aria-hidden="true">→</span></Link></div></div></section>
      <section className="closing-cta content-container" data-reveal><div><p className="eyebrow">Ready when you are</p><h2>Start with the document in front of you.</h2></div><Link className="primary-button" href="/complaints/new">Start a complaint <span aria-hidden="true">→</span></Link></section>
    </div>
  </SiteShell>;
}
