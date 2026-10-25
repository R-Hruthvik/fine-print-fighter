import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell, PageIntro } from "@/components/SiteShell";
import { GUIDES, packLabel } from "@/lib/catalog";

const detail: Record<string, { intro: string; steps: string[]; sources: { title: string; url: string }[] }> = {
  "keep-a-clear-record": { intro: "A short, dated timeline helps separate what happened from what you were told afterward. Keep the source document beside each event so you can check it later.", steps: ["Write down the date and time of each cancellation request.", "Save the exact confirmation, support reply, or error message.", "List renewal and charge dates from your account history or statement.", "Ask the company to identify the account status and explain any disputed charge.", "Keep a copy of the final response and any reference number."], sources: [{ title: "Netflix Help Center: How to cancel", url: "https://help.netflix.com/en/node/407" }] },
  "read-a-flight-disruption": { intro: "Passenger rights can vary by route, operating carrier, and the cause and duration of the disruption. Keep the itinerary and the airline’s explanation together, and check the regulator material that applies to that route.", steps: ["Record the flight number, travel date, and operating airline.", "Keep the original itinerary and note actual departure and arrival times.", "Save cancellation, rebooking, and delay notices with timestamps.", "List assistance offered and any expenses you paid yourself.", "Ask the carrier for its recorded reason for the disruption."], sources: [{ title: "Air India: Passenger rights and travel regulations", url: "https://www.airindia.com/in/en/passenger-rights.html" }] },
  "check-a-medical-bill": { intro: "Medical billing rules depend on the jurisdiction, type of care, insurance status, and provider. Start with an itemized bill and compare it with the estimate and insurer explanation, if applicable.", steps: ["Ask for an itemized statement and identify the exact line item you question.", "Compare the bill with the estimate, consent form, or financial policy you received.", "If insured, compare provider charges with the explanation of benefits.", "Write down what the provider or insurer says and request a written response.", "Keep records of dates, names, and case or reference numbers."], sources: [{ title: "CFPB: What is a surprise medical bill?", url: "https://www.consumerfinance.gov/ask-cfpb/what-is-a-surprise-medical-bill-and-what-should-i-know-about-the-no-surprises-act-en-2123/" }] },
};

export function generateStaticParams() { return GUIDES.map((guide) => ({ slug: guide.slug })); }

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDES.find((entry) => entry.slug === slug);
  const content = detail[slug];
  if (!guide || !content) notFound();
  return <SiteShell><div className="content-wrap">
    <div className="backline"><Link href="/guides">← All guides</Link><span> / </span><Link href={`/complaints/${guide.packId}`}>{packLabel(guide.packId)}</Link></div>
    <PageIntro eyebrow="Practical guide" title={guide.title} body={content.intro} />
    <section className="guide-steps"><p className="eyebrow">A simple checklist</p><ol>{content.steps.map((step, index) => <li key={step}><span className="row-index">0{index + 1}</span><p>{step}</p></li>)}</ol></section>
    <section className="source-section"><p className="eyebrow">Official reading</p><h2>Check the original material</h2><p>This page is a starting point. Check current official information and whether it applies to your circumstances.</p><ul className="source-list">{content.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} <span aria-hidden="true">↗</span></a></li>)}</ul></section>
    <div className="closing-cta"><h2>Continue with a complaint review.</h2><p>Gather the relevant documents first. Analysis can be used as a guest and does not contact anyone.</p><Link className="primary-button" href={`/complaints/new?pack=${guide.packId}`}>Start with {packLabel(guide.packId)} <span aria-hidden="true">→</span></Link></div>
  </div></SiteShell>;
}
