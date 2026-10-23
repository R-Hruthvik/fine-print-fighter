import { getPack } from "./packs";
import type { Country } from "./types";

export class RequestError extends Error {
  constructor(public status: number, public code: string, message: string, public retryable = false) {
    super(message);
  }
}

export function parseCaseRequest(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new RequestError(400, "INVALID_REQUEST", "Provide a case as a JSON object.");
  const b = input as Record<string, unknown>;
  if (typeof b.documentText !== "string" || !b.documentText.trim()) throw new RequestError(400, "INVALID_REQUEST", "Please provide document text.");
  if (b.documentText.length > 30000) throw new RequestError(413, "INPUT_TOO_LARGE", "Document text exceeds 30,000 characters.");
  if (typeof b.packId !== "string" || !getPack(b.packId)) throw new RequestError(400, "INVALID_REQUEST", "Choose a supported case type.");
  if (typeof b.country !== "string" || !["IN", "EU", "US"].includes(b.country)) throw new RequestError(400, "INVALID_REQUEST", "Choose India, the European Union, or the United States.");
  const option = (key: string, limit: number, fallback?: string) => {
    const value = b[key];
    if (value === undefined) return fallback;
    if (typeof value !== "string") throw new RequestError(400, "INVALID_REQUEST", `${key} must be text.`);
    if (value.length > limit) throw new RequestError(413, "INPUT_TOO_LARGE", `${key} exceeds ${limit} characters.`);
    return value.trim() || fallback;
  };
  return {
    documentText: b.documentText,
    packId: b.packId,
    country: b.country as Country,
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
  const e = error as { status?: number; code?: string; retryable?: boolean; stage?: string } | null;
  const status = e?.status && Object.hasOwn(SAFE_MESSAGES, e.status) ? e.status : 500;
  const code = typeof e?.code === "string" && /^[A-Z_]{1,50}$/.test(e.code) ? e.code : "INTERNAL_ERROR";
  const publicMessage = error instanceof RequestError ? error.message : SAFE_MESSAGES[status] ?? "Analysis failed unexpectedly. Please try again.";
  return Response.json({ error: publicMessage, code, retryable: e?.retryable === true, requestId }, {
    status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) },
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
