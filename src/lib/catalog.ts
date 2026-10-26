import { CASE_TYPES, COUNTRIES } from "./packs";
import type { CaseType, Country } from "./types";

export type CompanyEntry = {
  slug: string;
  name: string;
  officialDomain: string;
  summary: string;
  packIds: CaseType[];
  jurisdictions: Country[];
  sourceUrls: string[];
  reviewedOn: string;
};

// Coverage means that relevant official material has been recorded for research.
// It does not mean a person qualifies for a remedy or that a claim will succeed.
export const COMPANIES: CompanyEntry[] = [
  {
    slug: "air-india", name: "Air India", officialDomain: "airindia.com",
    summary: "Flight disruption information and complaint channels published by Air India. EU claim information is route-specific.",
    packIds: ["flight-delay"], jurisdictions: ["IN", "EU"],
    sourceUrls: ["https://www.airindia.com/in/en/passenger-rights.html", "https://www.airindia.com/in/en/frequently-asked-questions/booking.html", "https://www.airindia.com/in/en/contact-us/customer-support-portal/flight-distruption.html", "https://www.dgca.gov.in/digigov-portal/Upload?attachId=we1PSlOuQhYdHcwKKrm7ew%3D%3D&flag=iframeAttachView", "https://europa.eu/youreurope/citizens/travel/passenger-rights/air/"], reviewedOn: "2026-10-26",
  },
  {
    slug: "netflix", name: "Netflix", officialDomain: "netflix.com",
    summary: "Official membership cancellation instructions and US regulator guidance on recurring subscriptions. Billing and cancellation rights can depend on the billing partner and jurisdiction.",
    packIds: ["subscription-cancel"], jurisdictions: ["US"],
    sourceUrls: ["https://help.netflix.com/en/node/407", "https://consumer.ftc.gov/articles/getting-and-out-free-trials-auto-renewals-and-negative-option-subscriptions"], reviewedOn: "2026-10-26",
  },
];

export const GUIDES = [
  { slug: "keep-a-clear-record", title: "Keep a clear record", summary: "Build a simple timeline from notices, receipts, emails, and support replies.", packId: "subscription-cancel" },
  { slug: "read-a-flight-disruption", title: "Read a flight disruption", summary: "Capture the route, operating carrier, timings, and the reason the airline gave.", packId: "flight-delay" },
  { slug: "check-a-medical-bill", title: "Check a medical bill", summary: "Compare the bill with your estimate, explanation of benefits, and provider response.", packId: "surprise-bill" },
];

export const packLabel = (id: string) => CASE_TYPES.find((item) => item.id === id)?.label ?? id;
export const jurisdictionLabel = (code: string) => COUNTRIES.find((item) => item.code === code)?.label ?? code;
