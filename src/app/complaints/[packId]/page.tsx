import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell, PageIntro } from "@/components/SiteShell";
import { CASE_TYPES, getPack } from "@/lib/packs";

const copy: Record<string, { intro: string; useful: string[]; questions: string[] }> = {
  "flight-delay": { intro: "A useful review starts with the actual journey and the airline’s explanation. Route, operating carrier, timing, and cause can all affect which rules are relevant.", useful: ["Booking confirmation and ticket number", "Scheduled and actual departure or arrival times", "Messages explaining the delay, cancellation, or rebooking", "Receipts for expenses and details of any assistance offered"], questions: ["Which airline operated the affected flight?", "Where did the journey start and end?", "What reason did the airline give, and when?"] },
  "subscription-cancel": { intro: "Lay out each cancellation attempt against the billing timeline. A confirmation, account screenshot, or support transcript can help clarify when a request was made and what happened next.", useful: ["Plan terms and renewal notices", "Cancellation confirmation or account screenshots", "Support chat, email, or ticket reference", "Statements showing charges after your cancellation attempt"], questions: ["How did you try to cancel?", "What confirmation did the service provide?", "Which charges do you dispute and why?"] },
  "surprise-bill": { intro: "A disputed fee is easier to assess when the charge can be compared with the estimate, agreement, or published fee schedule that applied at the time.", useful: ["The itemized bill and payment record", "Any quote, estimate, order summary, or plan terms", "The explanation from the provider or billing company", "Insurance explanation of benefits, if relevant"], questions: ["Which line item or fee is disputed?", "What price or amount did you expect, and based on what?", "What explanation has the company given?"] },
};

export function generateStaticParams() { return CASE_TYPES.map((pack) => ({ packId: pack.id })); }

export default async function ComplaintGuidePage({ params }: { params: Promise<{ packId: string }> }) {
  const { packId } = await params;
  const pack = getPack(packId);
  const content = copy[packId];
  if (!pack || !content) notFound();
  return <SiteShell><div className="content-wrap">
    <div className="backline"><Link href="/complaints">← All complaint types</Link><span> / </span><span>{pack.name}</span></div>
    <PageIntro eyebrow="Complaint guide" title={pack.name} body={content.intro} />
    <div className="guide-columns">
      <section className="guide-section"><p className="eyebrow">Before you begin</p><h2>Bring the record, not just the conclusion.</h2><p>Paste the primary document and the company’s actual response as separate pieces of evidence. You can remove names and account details that are not needed for the analysis.</p><ul className="ruled-list">{content.useful.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <aside className="guide-note"><span className="small-label">Questions the review may explore</span><ol>{content.questions.map((item) => <li key={item}>{item}</li>)}</ol><p>Missing information may limit the result. It will not be filled in as fact.</p></aside>
    </div>
    <section className="jurisdiction-note"><h2>Jurisdiction matters.</h2><p>Initial research is scoped to India, the European Union, and the United States. The applicable rules may depend on where a service was provided, your route, the specific company, and your contract. A category match does not establish eligibility.</p></section>
    <div className="closing-cta"><h2>Ready to review your documents?</h2><p>You can try the analysis as a guest. Your case is not saved unless you choose to save it after analysis.</p><Link className="primary-button" href={`/complaints/new?pack=${pack.id}`}>Continue with this complaint <span aria-hidden="true">→</span></Link></div>
  </div></SiteShell>;
}
