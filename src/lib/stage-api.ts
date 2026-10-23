import { allowStageRoute, errorResponse, readJSON, RequestError } from "./request";
import { isObject, stringList, text } from "./provider";
import { getPack } from "./packs";
import { planQueries, evaluateFindings, scoreCase, draftLetter, escalateLadder } from "./llm";
import { verifyFindings, safeSourceURL } from "./evidence";
import { researchQueries } from "./tavily";
import type { Country, ExtractedFacts, Finding, Source } from "./types";

export type StageName = "plan" | "research" | "evaluate" | "score" | "draft" | "escalate";
const invalid = () => new RequestError(400, "INVALID_REQUEST", "Invalid stage input. Use a registered pack and valid facts, sources, and jurisdiction.");
function sourcesOf(value: unknown): Source[] {
  if (!Array.isArray(value) || value.length > 30 || !value.every(s => isObject(s) && text(s.id,20) && /^s\d+$/.test(s.id) && text(s.url,3000) && safeSourceURL(s.url) && text(s.title,1000) && text(s.snippet,6000) && text(s.retrievedAt,50))) throw invalid();
  if (new Set(value.map(s => s.id)).size !== value.length) throw invalid();
  return value as Source[];
}
function findingsOf(value: unknown): Finding[] {
  if (!Array.isArray(value) || value.length > 20 || !value.every(f => isObject(f) && text(f.statement,3000) && stringList(f.sourceIds,10) && text(f.supportingPassage,3000) && ["favors-customer","favors-company","unclear"].includes(String(f.stance)))) throw invalid();
  return value as Finding[];
}
function factsOf(value: unknown): ExtractedFacts {
  if (!isObject(value) || Object.keys(value).length > 60 || !Object.values(value).every(v => v === null || text(v,5000) || typeof v === "number" && Number.isFinite(v) || stringList(v,30))) throw invalid();
  return value as ExtractedFacts;
}

export async function handleStage(stage: StageName, request: Request, enabled = allowStageRoute()): Promise<Response> {
  if (!enabled) return Response.json({ error: "Not found" }, { status: 404 });
  const requestId = crypto.randomUUID();
  try {
    const b = await readJSON(request);
    if (!isObject(b)) throw invalid();
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(120000)]);
    let result: unknown;
    if (stage === "research") {
      if (!Array.isArray(b.queries) || !b.queries.length || b.queries.length > 6 || !b.queries.every(q => isObject(q) && text(q.query,300) && q.query.trim() && ["rules","company policy","similar cases"].includes(String(q.targets)))) throw invalid();
      result = { sources: await researchQueries(b.queries as {query:string;targets:string}[], signal) };
    } else if (stage === "score") {
      const sources = sourcesOf(b.sources);
      result = await scoreCase(verifyFindings(findingsOf(b.findings), sources), signal);
    } else {
      const pack = typeof b.packId === "string" ? getPack(b.packId) : undefined;
      if (!pack) throw invalid();
      if (stage === "plan" || stage === "escalate") {
        if (!["IN","EU","US"].includes(String(b.country))) throw invalid();
        const country = b.country as Country;
        result = stage === "plan" ? { queries: await planQueries(factsOf(b.facts), country, pack, signal) } : { ladder: await escalateLadder(pack, country, sourcesOf(b.sources), signal) };
      } else if (stage === "evaluate") {
        result = await evaluateFindings(factsOf(b.facts), sourcesOf(b.sources), pack, signal);
      } else {
        const preference = (key: string, max: number, fallback: string) => {
          if (b[key] === undefined) return fallback;
          if (!text(b[key], max)) throw invalid();
          return b[key].trim() || fallback;
        };
        const facts = factsOf(b.facts);
        // Fresh source checks; no client-supplied verification flag crosses the boundary.
        const sources = sourcesOf(b.sources);
        const findings = verifyFindings(findingsOf(b.findings), sources);
        result = await draftLetter(facts, findings, {}, pack, preference("userName",200,"not supplied"), preference("desiredOutcome",2000,"a fair review of the disputed charge"), preference("language",80,"English"), preference("replyDeadline",100,"14 days"), sources, signal);
      }
    }
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error, requestId); }
}
