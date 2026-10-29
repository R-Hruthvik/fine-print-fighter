/** Minimize entities before they leave the server in a search query. */
export function safeSearchEntity(value: unknown, fallback = "company"): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  if (/@|\b(account|address|reference|booking|postal|postcode|zip|suite|unit|apartment)\b/i.test(value)) return fallback;
  if (/\b\d{1,6}\s+[\p{L}.]+\s+(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?)\b/iu.test(value)) return fallback;
  if ((value.match(/\d/g)?.length ?? 0) >= 7) return fallback;
  return value.replace(/[^\p{L}\p{N}\s&.'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 100) || fallback;
}

/** A narrow trigger; absence of a trigger means the customer can proceed using their records. */
export function workspaceResearchNeeded(account:string,reply:string):boolean {
  return /\b(policy|policies|terms|contract|refund|renewal|cancell?ation|deadline|chargeback|ombudsman|regulator|file a complaint)\b/i.test(`${account} ${reply}`);
}
