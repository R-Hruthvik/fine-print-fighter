import type { CaseType, Country } from "./types";

export type OfficialSource = {
  title: string;
  url: string;
  publisher: string;
  kind: "regulator" | "official_company" | "official_explainer";
  scope: string;
};

export type SourceProfile = {
  packId: CaseType;
  jurisdiction: Country;
  reviewedOn: string;
  coverage: "starting-points" | "limited";
  sources: OfficialSource[];
  limitation: string;
};

/**
 * Official pages opened and checked on the review date. These are starting
 * points for source discovery, not an eligibility or legal coverage decision.
 */
export const SOURCE_PROFILES: SourceProfile[] = [
  {
    packId: "flight-delay", jurisdiction: "IN", reviewedOn: "2026-10-26", coverage: "starting-points",
    sources: [
      { title: "Facilities for passengers affected by denied boarding, cancellation and delays", url: "https://www.dgca.gov.in/digigov-portal/Upload?attachId=we1PSlOuQhYdHcwKKrm7ew%3D%3D&flag=iframeAttachView", publisher: "Directorate General of Civil Aviation", kind: "regulator", scope: "Civil Aviation Requirement with revision dated 25 January 2023 and stated effective date 15 February 2023." },
      { title: "Passenger rights", url: "https://www.airindia.com/in/en/passenger-rights.html", publisher: "Air India", kind: "official_company", scope: "Company material; applies only if Air India is the relevant operating carrier and the stated terms cover the journey." },
    ],
    limitation: "The DGCA document has its own scope and exceptions. Check the operating carrier, route, event date, later amendments and the airline's response.",
  },
  {
    packId: "flight-delay", jurisdiction: "EU", reviewedOn: "2026-10-26", coverage: "starting-points",
    sources: [
      { title: "Air passenger rights", url: "https://europa.eu/youreurope/citizens/travel/passenger-rights/air/", publisher: "European Union — Your Europe", kind: "official_explainer", scope: "Explains when EU passenger-rights rules may apply, including route and carrier conditions." },
    ],
    limitation: "The EU rules are route- and carrier-dependent. Check the itinerary, operating carrier, event date, applicable national enforcement body and any later rule changes.",
  },
  {
    packId: "flight-delay", jurisdiction: "US", reviewedOn: "2026-10-26", coverage: "starting-points",
    sources: [
      { title: "Refunds", url: "https://www.transportation.gov/individuals/aviation-consumer-protection/refunds", publisher: "U.S. Department of Transportation", kind: "regulator", scope: "Official guidance about ticket refunds for cancellations and significant changes; it does not create a general delay-compensation rule." },
      { title: "Fly Rights", url: "https://www.transportation.gov/airconsumer/fly-rights", publisher: "U.S. Department of Transportation", kind: "official_explainer", scope: "General passenger information; airline commitments and route-specific rules still need checking." },
    ],
    limitation: "Refund rights and extra compensation are distinct. Check itinerary, ticket agent, airline commitments and the event date.",
  },
  {
    packId: "subscription-cancel", jurisdiction: "IN", reviewedOn: "2026-10-26", coverage: "limited",
    sources: [
      { title: "Consumer Protection (E-Commerce) Rules, 2020", url: "https://consumeraffairs.nic.in/sites/default/files/E%20commerce%20rules_0.pdf", publisher: "Department of Consumer Affairs, Government of India", kind: "regulator", scope: "Rules for e-commerce entities include disclosures about payment methods and cancellation of regular payments; applicability depends on the transaction and entity." },
      { title: "Consumer Protection", url: "https://consumeraffairs.nic.in/acts-and-rules/consumer-protection/consumer-protection", publisher: "Department of Consumer Affairs, Government of India", kind: "official_explainer", scope: "Official index for the Consumer Protection Act, rules and related materials." },
    ],
    limitation: "These sources do not establish a universal subscription-cancellation or refund entitlement. Check signup channel, payment partner, plan terms, transaction type and current rules.",
  },
  {
    packId: "subscription-cancel", jurisdiction: "EU", reviewedOn: "2026-10-26", coverage: "limited",
    sources: [
      { title: "Consumer Rights Directive", url: "https://commission.europa.eu/law/law-topic/consumer-protection-law/consumer-contract-law/consumer-rights-directive_en", publisher: "European Commission", kind: "regulator", scope: "EU framework for consumer contracts, pre-contract information and some distance-contract cancellation rights; exceptions and national implementation matter." },
      { title: "Protecting consumers when buying online", url: "https://commission.europa.eu/digital-life/protecting-you-when-buying-online_en", publisher: "European Commission", kind: "official_explainer", scope: "General online purchase guidance; individual subscription terms and withdrawal exceptions need checking." },
    ],
    limitation: "A right to withdraw from a new distance contract is different from cancelling an ongoing subscription. Check the Member State, service type, signup and cancellation dates, payment channel, and exceptions.",
  },
  {
    packId: "subscription-cancel", jurisdiction: "US", reviewedOn: "2026-10-26", coverage: "limited",
    sources: [
      { title: "Negative Option Rule and current rulemaking materials", url: "https://www.ftc.gov/legal-library/browse/rules/negative-option-rule", publisher: "Federal Trade Commission", kind: "regulator", scope: "The FTC page lists rulemaking materials and updates; confirm current legal status and effective dates before relying on any specific provision." },
      { title: "Getting out of free trials, auto-renewals, and other negative option subscriptions", url: "https://consumer.ftc.gov/articles/getting-and-out-free-trials-auto-renewals-and-negative-option-subscriptions", publisher: "Federal Trade Commission", kind: "official_explainer", scope: "Consumer guidance; state laws, sector rules, signup method and billing channel may also matter." },
    ],
    limitation: "Subscription rules can depend on state, sector, enrollment method and current rule status. A cited cancellation rule does not establish that it applies to this account.",
  },
  {
    packId: "surprise-bill", jurisdiction: "IN", reviewedOn: "2026-10-26", coverage: "limited",
    sources: [
      { title: "Consumer Protection Act and related rules", url: "https://consumeraffairs.nic.in/acts-and-rules/consumer-protection/consumer-protection", publisher: "Department of Consumer Affairs, Government of India", kind: "regulator", scope: "Official index for general consumer-protection materials; the disputed sector may have separate rules." },
      { title: "Directorate General of Health Services Citizen Charter", url: "https://www.dghs.gov.in/charter.php", publisher: "Directorate General of Health Services, Government of India", kind: "official_explainer", scope: "Hospital grievance information, not a universal hospital-fee or billing entitlement." },
    ],
    limitation: "There is no single source here for every kind of unexpected fee. Identify the service sector, state, provider type, contract and applicable regulator before drawing conclusions.",
  },
  {
    packId: "surprise-bill", jurisdiction: "EU", reviewedOn: "2026-10-26", coverage: "limited",
    sources: [
      { title: "Consumer Rights Directive", url: "https://commission.europa.eu/law/law-topic/consumer-protection-law/consumer-contract-law/consumer-rights-directive_en", publisher: "European Commission", kind: "regulator", scope: "Consumer-contract information framework; it is not a universal rule for every unexpected invoice or sector." },
      { title: "Cross-border healthcare", url: "https://health.ec.europa.eu/cross-border-healthcare_en", publisher: "European Commission, Directorate-General for Health and Food Safety", kind: "official_explainer", scope: "Information about healthcare received in another Member State and reimbursement routes; national systems and circumstances matter." },
    ],
    limitation: "EU consumer and health rules do not create one universal billing rule. Identify the country, sector, provider, insurance arrangement and cross-border status.",
  },
  {
    packId: "surprise-bill", jurisdiction: "US", reviewedOn: "2026-10-26", coverage: "limited",
    sources: [
      { title: "Ending Surprise Medical Bills", url: "https://www.cms.gov/nosurprises/Ending-Surprise-Medical-Bills", publisher: "Centers for Medicare & Medicaid Services", kind: "regulator", scope: "No Surprises Act information for specified emergency, out-of-network and air-ambulance situations; scope and exceptions apply." },
      { title: "Get help with your medical bill", url: "https://www.cms.gov/initiatives/your-patient-rights/medical-bill-rights/get-help", publisher: "Centers for Medicare & Medicaid Services", kind: "official_explainer", scope: "Explains help available and exclusions; this is specific to medical billing, not consumer fees generally." },
    ],
    limitation: "This source set addresses medical bills only. Coverage may depend on insurance type, service, provider, state law and the date of care; other sectors need separate sources.",
  },
];

export function getSourceProfile(packId: string, jurisdiction: Country): SourceProfile | undefined {
  return SOURCE_PROFILES.find((profile) => profile.packId === packId && profile.jurisdiction === jurisdiction);
}
