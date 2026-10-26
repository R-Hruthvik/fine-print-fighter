import type { PipelineResult, RulePack, Country, ExtractedFacts, CompensationResult, AnalysisProgressEvent, AnalysisStage, ScopeAnswers, Source } from "./types";
import { extractFacts, planQueries, evaluateFindings, scoreCase, draftLetter, escalateLadder } from "./llm";
import { researchWithWarnings } from "./tavily";
import { ProviderError, requireProviderConfiguration } from "./provider";
import { investigateObjections } from "./rebuttal";
import { normalizeScopeAnswers } from "./scope-answers";
import { getSourceProfile } from "./source-registry";
import { COMPANIES } from "./catalog";

export interface PipelineOptions {
  documentText: string;
  companyResponse?: string;
  companyName?: string;
  additionalDocuments?: {id:string;label:string;text:string}[];
  scopeAnswers?: ScopeAnswers;
  pack: RulePack;
  country: Country;
  userName?: string;
  desiredOutcome?: string;
  language?: string;
  replyDeadline?: string;
  signal?: AbortSignal;
  requestId?: string;
  onProgress?: (event: AnalysisProgressEvent) => void;
}

function canonicalSourceURL(value:string):string|undefined {
  try { const url=new URL(value); url.hash=""; return url.toString(); }
  catch { return undefined; }
}

export function classifySourceProfiles(sources:Source[],pack:RulePack,country:Country,companyName?:string):void {
  const profile=getSourceProfile(pack.id,country);
  const officialPages=new Map((profile?.sources ?? []).map(source=>[canonicalSourceURL(source.url),source]));
  const company=COMPANIES.find(entry=>entry.name.toLocaleLowerCase()===companyName?.trim().toLocaleLowerCase()
    && entry.packIds.includes(pack.id) && entry.jurisdictions.includes(country));
  for (const source of sources) {
    const registered=officialPages.get(canonicalSourceURL(source.url));
    if (registered) {
      source.authority=registered.kind;
      source.publisher=registered.publisher;
      source.jurisdiction=country;
      source.freshness="unknown";
      continue;
    }
    let officialCompanyHost=false;
    try {
      const host=new URL(source.url).hostname.toLowerCase();
      const domain=company?.officialDomain.toLowerCase();
      officialCompanyHost=Boolean(domain && (host===domain || host.endsWith(`.${domain}`)));
    } catch { /* unsafe URLs stay unreviewed */ }
    source.authority=officialCompanyHost ? "official_company" : "unreviewed";
    source.publisher=officialCompanyHost ? company?.name : source.publisher;
    source.jurisdiction=officialCompanyHost ? country : "unknown";
    source.freshness="unknown";
  }
}

function unknown(value: unknown): boolean {
  return value == null || value === "" || (Array.isArray(value) && value.length === 0) || (typeof value === "string" && /^(not stated|unknown|not supplied|not found)$/i.test(value.trim()));
}

/** A documented charge is never treated as a sourced entitlement. */
export function describeRemedy(facts: ExtractedFacts): CompensationResult {
  const raw = facts.disputedAmount ?? facts.amount ?? facts.ticketPrice;
  const currency = typeof facts.currency === "string" && /^[A-Z]{3}$/.test(facts.currency) ? facts.currency : undefined;
  const disputedAmount = typeof raw === "number" && Number.isFinite(raw) && raw >= 0 && currency ? raw : undefined;
  return {
    noAmountFound: true,
    ...(disputedAmount !== undefined ? { disputedAmount, currency } : {}),
    working: "No applicable compensation formula has been independently established. A charge in your document is a disputed charge, not proof that a refund is owed. Request a review of the charge and supporting policy.",
  };
}

export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const { documentText, pack, country, companyName, userName = "not supplied", desiredOutcome = "a review and fair resolution of the disputed charge", language = "English", replyDeadline = "14 days", companyResponse = "", additionalDocuments = [] } = options;
  const scopeAnswers=options.scopeAnswers?.packId===pack.id ? options.scopeAnswers : normalizeScopeAnswers(pack.id);
  requireProviderConfiguration();
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const requestId = options.requestId ?? crypto.randomUUID();
  const deadline = AbortSignal.timeout(120000);
  const signal = options.signal ? AbortSignal.any([deadline, options.signal]) : deadline;
  const stageDurations: Record<string, number> = {};
  const emitProgress = (event: AnalysisProgressEvent) => {
    try { options.onProgress?.(event); } catch { /* Progress delivery must not change analysis results. */ }
  };
  async function stage<T>(name: AnalysisStage, action: () => Promise<T>): Promise<T> {
    if (signal.aborted) throw new ProviderError("Analysis cancelled or timed out.", 504, "ANALYSIS_TIMEOUT", true);
    const start = Date.now();
    emitProgress({ type: "stage", stage: name, phase: "started" });
    try {
      const value = await action();
      if (signal.aborted) throw new ProviderError("Analysis cancelled or timed out.", 504, "ANALYSIS_TIMEOUT", true);
      const durationMs = Date.now() - start;
      emitProgress({ type: "stage", stage: name, phase: "completed", durationMs });
      return value;
    } catch (error) {
      emitProgress({ type: "stage", stage: name, phase: "failed", durationMs: Date.now() - start });
      throw error;
    } finally { stageDurations[name] = Date.now() - start; }
  }
  const primaryPack={...pack,extractionSchema:pack.extractionSchema.filter(key=>key!=="companyResponse"&&key!=="companyPosition")};
  const extracted = await stage("extract", () => extractFacts(documentText, primaryPack, signal, true));
  const {facts,evidence:factEvidence}=extracted;
  const missing = pack.requiredFacts.filter(key => unknown(facts[key]));
  const queries = await stage("plan", () => planQueries(facts, country, pack, signal, companyName, scopeAnswers));
  const research = await stage("research", () => researchWithWarnings(queries, signal, pack.searchPlan.preferredDomains));
  const rebuttalLab=await stage("rebuttal",()=>investigateObjections({facts,companyResponse,country,sources:research.sources,additionalDocuments,signal,onAction:(action)=>emitProgress({type:"tool",...action})}));
  const sources=rebuttalLab.sources;
  classifySourceProfiles(sources,pack,country,companyName);
  const evaluation = await stage("evaluate", () => evaluateFindings(facts, sources, pack, signal, {companyResponse,additionalDocuments,primaryDocument:documentText,factEvidence,scopeAnswers}));
  const { findings, unverified, conflicts } = evaluation;
  const missingScope=scopeAnswers.answers.filter(answer=>answer.status==="not_provided").map(answer=>`If known, provide ${answer.label.toLowerCase()} to help review the scope. This detail was not supplied.`);
  const unanswered = [...new Set([...evaluation.unanswered, ...missing.map(key => `Please confirm ${key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()} to assess applicability.`),...missingScope])];
  const score = await stage("score", () => scoreCase(findings, signal));
  // Search outages and missing critical facts always restrict strength and coverage.
  if (missing.length || research.warnings.length) {
    if (score.rating === "strong") score.rating = "medium";
    if (score.coverage === "sufficient") score.coverage = "limited";
  }
  const compensation = describeRemedy(facts);
  const { letter, citations } = await stage("draft", () => draftLetter(facts, findings, compensation, pack, userName, desiredOutcome, language, replyDeadline, sources, signal, additionalDocuments));
  const escalation = await stage("escalate", () => escalateLadder(pack, country, sources, signal));
  const warnings = [...research.warnings,...rebuttalLab.warnings];
  if (language.trim().toLowerCase() !== "english") warnings.push("The reviewable letter template is currently available in English only. Your requested language was not used.");
  if (!queries.length) warnings.push("No usable research queries could be generated. Evidence coverage is incomplete.");
  if (missing.length) warnings.push("Important applicability details are missing. Check the unanswered questions before relying on the analysis.");
  if (scopeAnswers.answers.some(answer=>answer.status==="provided")) warnings.push("Scope details are user-entered and have not been checked against the original documents.");
  if (missingScope.length) warnings.push("Some scope details were not provided. Jurisdiction and eligibility may depend on those details.");
  if (pack.lastReviewed === null) warnings.push("This rule pack has not completed a jurisdiction review. Escalation entries are research suggestions; verify each body and deadline on its official website.");
  if (findings.some(f => f.verified && f.applicability !== "supported")) warnings.push("Matching passages establish traceability only. Applicability and claim interpretation still need review.");
  return {
    facts, factEvidence, scopeAnswers, queries: queries.map(q => q.query), sources, findings, score, compensation, letter,
    letterCitations: citations, escalation, unanswered, unverified, conflicts,
    warnings: [...new Set(warnings)], country,
    rebuttalLab:{objections:rebuttalLab.objections,actions:rebuttalLab.actions},
    run: { requestId, startedAt, durationMs: Date.now() - started, stageDurations, model: process.env.NEMOTRON_MODEL || "nvidia/Nemotron-3_5-Lightning", researchMode: process.env.TAVILY_API_KEY ? "keyed" : "keyless", packVersion: pack.version },
  };
}

export type { RulePack, Country };
