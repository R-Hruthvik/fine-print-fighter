import { SiteShell, PageIntro } from "@/components/SiteShell";
import { CompanyDirectory } from "@/components/CompanyDirectory";
import { COMPANIES } from "@/lib/catalog";

export default function CompaniesPage() {
  return <SiteShell><div className="content-wrap">
    <PageIntro eyebrow="Company coverage" title="A small, source-linked directory." body="These entries collect official company material for the complaint types and jurisdictions shown. Coverage is limited and does not establish that a law applies to your situation." />
    <CompanyDirectory companies={COMPANIES} />
    <section className="unlisted-note"><h2>Not listed?</h2><p>Enter any company in the complaint flow. The analysis can still work from the documents and jurisdiction you provide, though company-specific research may be limited or unavailable.</p></section>
  </div></SiteShell>;
}
