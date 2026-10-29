import { getPack } from "./packs";
import type { Country, ScopeAnswers } from "./types";
import { ProviderError } from "./provider";
import { normalizeScopeAnswers } from "./scope-answers";

export class RequestError extends Error {
  constructor(public status: number, public code: string, message: string, public retryable = false, public retryAfterSeconds?: number) {
    super(message);
  }
}

interface CaseRequest {
  documentText:string; companyResponse:string; additionalDocuments:{id:string;label:string;text:string;role?:"previous-company-reply"}[];
  workspaceMode?:boolean; workspaceRecords:{id:string;label:string;text:string}[]; workspacePrimary?:{id:string;label:string}; packId:string; country:Country; scopeAnswers:ScopeAnswers;
  companyName?:string; userName?:string; desiredOutcome?:string; language?:string; replyDeadline?:string;
}
export function parseCaseRequest(input: unknown): CaseRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new RequestError(400, "INVALID_REQUEST", "Provide a case as a JSON object.");
  const b = input as Record<string, unknown>;
  if (b.workspaceDocuments !== undefined) {
    if (!Array.isArray(b.workspaceDocuments) || b.workspaceDocuments.length > 4) throw new RequestError(400, "INVALID_REQUEST", "Provide up to four workspace documents.");
    if (typeof b.documentText !== "string") throw new RequestError(400, "INVALID_REQUEST", "Your account must be text.");
    const ids = new Set<string>();
    const docs = b.workspaceDocuments.map((item: unknown) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new RequestError(400, "INVALID_REQUEST", "Each document needs a label and text.");
      const doc = item as Record<string, unknown>;
      if (typeof doc.id !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(doc.id) || ids.has(doc.id) || typeof doc.label !== "string" || !doc.label.trim() || doc.label.length > 100 || typeof doc.text !== "string" || !doc.text.trim() || !["record", "company-reply", "previous-company-reply"].includes(String(doc.role))) throw new RequestError(400, "INVALID_REQUEST", "Each document needs a unique ID, label, role and text.");
      if (doc.text.length > 12000) throw new RequestError(413, "INPUT_TOO_LARGE", "A document exceeds 12,000 characters.");
      ids.add(doc.id);
      return {id:doc.id, label:doc.label.trim(), text:doc.text, role:doc.role};
    });
    const replies=docs.filter(doc=>doc.role === "company-reply");
    if (replies.length > 1 || replies.length && typeof b.companyResponse === "string" && b.companyResponse.trim()) throw new RequestError(400, "INVALID_REQUEST", "Provide only one company reply for this review.");
    const records=docs.filter(doc=>doc.role === "record");
    const primaryDocument=b.documentText.trim() ? undefined : records.shift();
    const primary=primaryDocument?.text ?? b.documentText;
    const existing=b.additionalDocuments === undefined ? [] : b.additionalDocuments;
    if (!Array.isArray(existing)) throw new RequestError(400, "INVALID_REQUEST", "Additional documents must be a list.");
    const rest=docs.filter(doc => doc.role === "previous-company-reply").concat(records).map(({id,label,text,role})=>({id,label,text,...(role === "previous-company-reply" ? {role} : {})}));
    const parsed=parseCaseRequest({...b, workspaceDocuments:undefined, documentText:primary, companyResponse:replies[0]?.text ?? b.companyResponse, additionalDocuments:[...rest,...existing]});
    return {...parsed, workspaceMode:true, workspacePrimary:primaryDocument ? {id:primaryDocument.id,label:primaryDocument.label} : undefined, workspaceRecords:records.map(({id,label,text})=>({id,label,text}))};
  }
  if (typeof b.documentText !== "string" || !b.documentText.trim()) throw new RequestError(400, "INVALID_REQUEST", "Please provide document text.");
  if (b.documentText.length > 30000) throw new RequestError(413, "INPUT_TOO_LARGE", "Document text exceeds 30,000 characters.");
  const companyResponse = b.companyResponse === undefined ? "" : b.companyResponse;
  if (typeof companyResponse !== "string") throw new RequestError(400, "INVALID_REQUEST", "Company response must be text.");
  if (!companyResponse.trim() && b.intent !== "first-complaint") throw new RequestError(400, "INVALID_REQUEST", "Provide the company’s response or rejection for the Rebuttal Lab.");
  if (companyResponse.length > 12000) throw new RequestError(413, "INPUT_TOO_LARGE", "Company response exceeds 12,000 characters.");
  const additionalDocuments = b.additionalDocuments === undefined ? [] : b.additionalDocuments;
  if (!Array.isArray(additionalDocuments) || additionalDocuments.length > 3) throw new RequestError(400, "INVALID_REQUEST", "Provide up to three additional evidence documents.");
  let additionalLength = 0;
  const additionalIds = new Set<string>();
  const parsedDocuments = additionalDocuments.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new RequestError(400, "INVALID_REQUEST", "Each additional document must include an ID, label, and text.");
    const doc = item as Record<string, unknown>;
    if (typeof doc.id !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(doc.id) || typeof doc.label !== "string" || !doc.label.trim() || doc.label.length > 100 || typeof doc.text !== "string" || !doc.text.trim()) throw new RequestError(400, "INVALID_REQUEST", "Each additional document must include a valid ID, label, and text.");
    if (additionalIds.has(doc.id)) throw new RequestError(400, "INVALID_REQUEST", "Additional evidence document IDs must be unique.");
    additionalIds.add(doc.id);
    if (doc.text.length > 12000) throw new RequestError(413, "INPUT_TOO_LARGE", "An additional evidence document exceeds 12,000 characters.");
    if (doc.role !== undefined && doc.role !== "previous-company-reply") throw new RequestError(400, "INVALID_REQUEST", "Unknown additional document role.");
    additionalLength += doc.text.length;
    return { id: doc.id, label: doc.label.trim(), text: doc.text, ...(doc.role === "previous-company-reply" ? {role:"previous-company-reply" as const} : {}) };
  });
  if (b.documentText.length + companyResponse.length + additionalLength > 30000) throw new RequestError(413, "INPUT_TOO_LARGE", "Combined case documents exceed 30,000 characters.");
  if (typeof b.packId !== "string" || !getPack(b.packId)) throw new RequestError(400, "INVALID_REQUEST", "Choose a supported case type.");
  const packId = b.packId;
  if (typeof b.country !== "string" || !["IN", "EU", "US"].includes(b.country)) throw new RequestError(400, "INVALID_REQUEST", "Choose India, the European Union, or the United States.");
  const option = (key: string, limit: number, fallback?: string) => {
    const value = b[key];
    if (value === undefined) return fallback;
    if (typeof value !== "string") throw new RequestError(400, "INVALID_REQUEST", `${key} must be text.`);
    if (value.length > limit) throw new RequestError(413, "INPUT_TOO_LARGE", `${key} exceeds ${limit} characters.`);
    return value.trim() || fallback;
  };
  let scopeAnswers;
  try { scopeAnswers = normalizeScopeAnswers(packId as Parameters<typeof normalizeScopeAnswers>[0], b.scopeAnswers); }
  catch (error) { throw new RequestError(400, "INVALID_SCOPE_ANSWERS", error instanceof Error ? error.message : "Check the scope answers."); }
  return {
    documentText: b.documentText,
    workspaceRecords: [] as {id:string;label:string;text:string}[],
    companyResponse: companyResponse.trim(),
    additionalDocuments: parsedDocuments,
    packId,
    country: b.country as Country,
    scopeAnswers,
    companyName: option("companyName", 200),
    userName: option("userName", 200),
    desiredOutcome: option("desiredOutcome", 2000),
    language: option("language", 80, "English"),
    replyDeadline: option("replyDeadline", 100, "14 days"),
  };
}

export async function readJSON(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "INVALID_JSON", "Provide valid JSON.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 256 * 1024) {
        await reader.cancel();
        throw new RequestError(413, "INPUT_TOO_LARGE", "Request is too large. Limit: 256 KiB.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer)); }
  catch { throw new RequestError(400, "INVALID_JSON", "Provide valid JSON."); }
}

const SAFE_MESSAGES: Record<number, string> = {
  400: "Check the information you provided.", 413: "Request is too large.",
  429: "Too many analyses. Please wait a minute and try again.",
  502: "The analysis provider could not produce a valid response. Please try again.",
  503: "Analysis is unavailable. Configure the model and research providers before trying again.",
  504: "Analysis took too long. Please try again with a shorter document.",
};

export function errorResponse(error: unknown, requestId: string): Response {
  const e = error as { status?: number; code?: string; retryable?: boolean; stage?: string; retryAfterSeconds?: number } | null;
  const status = e?.status && Object.hasOwn(SAFE_MESSAGES, e.status) ? e.status : 500;
  const code = typeof e?.code === "string" && /^[A-Z_]{1,50}$/.test(e.code) ? e.code : "INTERNAL_ERROR";
  const publicMessage = error instanceof RequestError || error instanceof ProviderError ? error.message : SAFE_MESSAGES[status] ?? "Analysis failed unexpectedly. Please try again.";
  return Response.json({ error: publicMessage, code, retryable: e?.retryable === true, requestId }, {
    status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": String(Math.max(1, e?.retryAfterSeconds ?? 60)) } : {}) },
  });
}

export function allowStageRoute(environment = process.env.NODE_ENV, enabled = process.env.ENABLE_STAGE_ROUTES) {
  return environment === "development" && enabled === "true";
}

export function takeBudget(entries: Map<string, { count: number; expires: number }>, key: string, now = Date.now(), max = 3) {
  for (const [id, value] of entries) if (value.expires <= now) entries.delete(id);
  const value = entries.get(key) ?? { count: 0, expires: now + 60000 };
  if (value.count >= max) return false;
  value.count++;
  entries.set(key, value);
  return true;
}
