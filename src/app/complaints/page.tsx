import Link from "next/link";
import { SiteShell, PageIntro } from "@/components/SiteShell";
import { CASE_TYPES } from "@/lib/packs";

const descriptions: Record<string, string> = {
  "flight-delay": "Record what happened on the journey, what the airline said, and what help or remedy it offered.",
  "subscription-cancel": "Build a timeline of cancellation attempts, renewal dates, and any charges or replies that followed.",
  "surprise-bill": "Compare the charge with the quote, plan, contract, or fee schedule you were given.",
};

export default function ComplaintsPage() {
  return <SiteShell><div className="content-wrap">
    <PageIntro eyebrow="Complaint types" title="Start with the problem you can document." body="Choose a guided category to organize the details that usually matter. The analysis is a research aid, not a decision about legal eligibility." />
    <div className="editorial-list" aria-label="Complaint categories">
      {CASE_TYPES.map((pack, index) => <article className="editorial-row" key={pack.id}>
        <span className="row-index">0{index + 1}</span><div><h2><Link href={`/complaints/${pack.id}`}>{pack.label}</Link></h2><p>{descriptions[pack.id]}</p></div><Link className="row-arrow" href={`/complaints/${pack.id}`} aria-label={`Read about ${pack.label}`}>↗</Link>
      </article>)}
    </div>
    <section className="coverage-strip"><div><span className="small-label">Current research jurisdictions</span><p>India · European Union · United States</p></div><p>Rules can depend on route, location, sector, provider, contract, and specific facts. Review every source before deciding what to do.</p></section>
    <section className="closing-cta"><h2>Have your documents ready?</h2><p>Analysis is available without an account. Nothing is sent to a company or filed for you.</p><Link className="primary-button" href="/complaints/new">Start a complaint <span aria-hidden="true">→</span></Link></section>
  </div></SiteShell>;
}
