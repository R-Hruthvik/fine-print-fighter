import type { CaseType, ScopeAnswer, ScopeAnswers } from "./types";

export type ScopeQuestion = {
  key: string;
  label: string;
  type: "text" | "date" | "textarea" | "select";
  help: string;
  options?: { value: string; label: string }[];
};

export const SCOPE_QUESTIONS: Record<CaseType, ScopeQuestion[]> = {
  "flight-delay": [
    { key: "operatingCarrier", label: "Operating airline", type: "text", help: "If you are unsure, leave this blank. The airline you booked through may differ from the operating carrier." },
    { key: "origin", label: "Departure airport or city", type: "text", help: "Use the airport code or city if you know it." },
    { key: "destination", label: "Arrival airport or city", type: "text", help: "Use the airport code or city if you know it." },
    { key: "eventDate", label: "Flight date", type: "date", help: "The date helps identify which information may have applied." },
    { key: "timeline", label: "What happened and when?", type: "textarea", help: "For example, scheduled and actual departure or arrival times, cancellation, or rebooking. Leave out booking references and unrelated personal details." },
  ],
  "subscription-cancel": [
    { key: "signupDate", label: "Signup date", type: "date", help: "Leave blank if you do not know the date." },
    { key: "cancellationDate", label: "Cancellation request date", type: "date", help: "Use the date you asked to cancel, if known." },
    { key: "billingPartner", label: "Who processes the payment?", type: "text", help: "For example, the service itself, an app store, mobile provider, or another payment partner." },
    { key: "signupChannel", label: "Where did you sign up or cancel?", type: "text", help: "For example, the company website, an app, or a telephone call." },
  ],
  "surprise-bill": [
    { key: "sector", label: "Service sector", type: "select", help: "Choose the closest match, or leave it unknown.", options: [
      { value: "healthcare", label: "Healthcare" }, { value: "telecommunications", label: "Telecommunications" },
      { value: "utilities", label: "Utilities" }, { value: "financial-services", label: "Financial services" },
      { value: "travel", label: "Travel" }, { value: "other", label: "Other" },
    ] },
    { key: "providerType", label: "Provider type", type: "text", help: "For example, hospital, clinic, phone carrier, utility, or lender." },
    { key: "serviceDate", label: "Service date", type: "date", help: "The date the service or purchase took place, if known." },
    { key: "billDate", label: "Bill or statement date", type: "date", help: "The date shown on the bill, if known." },
    { key: "insurerEobStatus", label: "Insurance or Explanation of Benefits (EOB)", type: "select", help: "For healthcare bills, note whether you received an EOB. Otherwise leave this unknown.", options: [
      { value: "received", label: "EOB received" }, { value: "not_received", label: "No EOB received" },
      { value: "not_relevant", label: "Not relevant to this bill" },
    ] },
  ],
};

const MAX_TEXT_LENGTH = 3000;
const MAX_FIELD_LENGTH = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Validates and labels intake responses; an omitted field is explicitly retained as unknown. */
export function normalizeScopeAnswers(packId: CaseType, input?: unknown): ScopeAnswers {
  const raw = input === undefined || input === null ? {} : input;
  if (!isRecord(raw)) throw new Error("Scope answers must be an object.");
  const questions = SCOPE_QUESTIONS[packId];
  const allowed = new Set(questions.map((question) => question.key));
  if (Object.keys(raw).some((key) => !allowed.has(key))) throw new Error("Scope answers do not match the selected complaint type.");

  const answers: ScopeAnswer[] = questions.map((question) => {
    const rawValue = raw[question.key];
    if (rawValue !== undefined && typeof rawValue !== "string") throw new Error(`${question.label} must be text.`);
    const value = typeof rawValue === "string" ? rawValue.trim() : "";
    const limit = question.type === "textarea" ? MAX_TEXT_LENGTH : MAX_FIELD_LENGTH;
    if (value.length > limit) throw new Error(`${question.label} exceeds ${limit} characters.`);
    if (question.type === "date" && value && !validDate(value)) throw new Error(`${question.label} must be a valid date.`);
    if (question.type === "select" && value && !question.options?.some((option) => option.value === value)) throw new Error(`${question.label} is not a supported option.`);
    return {
      key: question.key,
      label: question.label,
      value: value || null,
      status: value ? "provided" : "not_provided",
      provenance: "user_answer",
    };
  });
  return { packId, answers };
}

export function scopeAnswersToInput(scopeAnswers: unknown, packId: CaseType): Record<string, string> {
  if (!isRecord(scopeAnswers) || scopeAnswers.packId !== packId || !Array.isArray(scopeAnswers.answers)) return {};
  const raw: Record<string, string> = {};
  for (const answer of scopeAnswers.answers) {
    if (!isRecord(answer) || typeof answer.key !== "string") continue;
    if (typeof answer.value === "string") raw[answer.key] = answer.value;
  }
  return raw;
}

export function isValidScopeAnswers(value: unknown, packId: CaseType): value is ScopeAnswers {
  if (!isRecord(value) || value.packId !== packId || !Array.isArray(value.answers)) return false;
  try {
    const raw: Record<string, string> = {};
    for (const answer of value.answers) {
      if (!isRecord(answer) || typeof answer.key !== "string" || typeof answer.label !== "string"
        || (answer.value !== null && typeof answer.value !== "string")
        || !["provided", "not_provided"].includes(String(answer.status)) || answer.provenance !== "user_answer") return false;
      if (typeof answer.value === "string") raw[answer.key] = answer.value;
    }
    const normalized = normalizeScopeAnswers(packId, raw);
    return JSON.stringify(normalized) === JSON.stringify(value);
  } catch { return false; }
}
