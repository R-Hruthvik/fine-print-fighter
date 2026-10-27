"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CompanyEntry } from "@/lib/catalog";
import { jurisdictionLabel, packLabel } from "@/lib/catalog";

export function CompanyDirectory({ companies }: { companies: CompanyEntry[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => companies.filter((company) => `${company.name} ${company.officialDomain} ${company.summary}`.toLowerCase().includes(query.trim().toLowerCase())), [companies, query]);
  return <>
    <label className="directory-search" htmlFor="company-search">Find a listed company<input id="company-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company name" /></label>
    <p className="directory-count" aria-live="polite">{shown.length} {shown.length === 1 ? "company" : "companies"} listed</p>
    <div className="company-list">{shown.map((company) => <article className="company-entry" key={company.slug}>
      <div className="company-entry-main"><span className="small-label">{company.officialDomain}</span><h2><Link href={`/companies/${company.slug}`}>{company.name} <span aria-hidden="true">↗</span></Link></h2><p>{company.summary}</p></div>
      <dl className="company-meta"><div><dt>Complaint types</dt><dd>{company.packIds.map(packLabel).join(" · ")}</dd></div><div><dt>Source jurisdictions</dt><dd>{company.jurisdictions.map(jurisdictionLabel).join(" · ")}</dd></div><div><dt>Sources reviewed</dt><dd>{company.reviewedOn}</dd></div></dl>
    </article>)}</div>
    {shown.length === 0 ? <p className="empty-note">No listed company matches that search. You can still enter an unlisted company during complaint analysis; company-specific research may be limited.</p> : null}
  </>;
}
