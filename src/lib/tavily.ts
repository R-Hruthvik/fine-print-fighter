import { createHash } from 'node:crypto';
import type { Source } from './types';
import { isObject, ProviderError, text } from './provider';
import { safeSourceURL } from './evidence';

export interface TavilyResult {url:string;title:string;content:string}
export interface ResearchQuery {query:string;targets:string}

const MAX_EXTRACT_CANDIDATES = 3;
const MAX_EXTRACTED_CHARS = 12_000;

function canonicalURL(value:string):string|undefined {
  if (!safeSourceURL(value)) return undefined;
  const url=new URL(value);
  url.hash='';
  return url.toString();
}

async function extractCandidatePages(sources:Source[],queries:ResearchQuery[],signal?:AbortSignal):Promise<string[]> {
  const candidates=sources.slice(0,MAX_EXTRACT_CANDIDATES);
  for (const source of sources.slice(MAX_EXTRACT_CANDIDATES)) source.extractionStatus='not_selected';
  if (!candidates.length) return [];

  const key=process.env.TAVILY_API_KEY;
  if (!key) {
    for (const source of candidates) source.extractionStatus='skipped_no_key';
    return ['Tavily page extraction was skipped because no API key is configured; candidate search snippets remain unreviewed.'];
  }

  const extractedAt=new Date().toISOString();
  for (const source of candidates) {
    source.requestedUrl=source.url;
    source.extractionStatus='failed';
    source.extractionFailure='unavailable';
  }
  const timeout=signal ? AbortSignal.any([signal,AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000);
  let warning:string|undefined;
  try {
    const response=await fetch('https://api.tavily.com/extract',{
      method:'POST',signal:timeout,
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
      body:JSON.stringify({
        urls:candidates.map(source=>source.url),
        query:queries.slice(0,6).map(item=>item.query).join('; ').slice(0,500),
        chunks_per_source:5,extract_depth:'basic',include_images:false,include_favicon:false,
        format:'markdown',include_usage:false,
      }),
    });
    if (!response.ok) {
      const failure=response.status===429?'rate_limited':'unavailable';
      candidates.forEach(source=>source.extractionFailure=failure);
      warning=response.status===429
        ? 'Tavily page extraction reached its rate limit; retained search snippets remain the only available source text.'
        : 'Tavily page extraction was unavailable; retained search snippets remain the only available source text.';
      return [warning];
    }
    const data:unknown=await response.json();
    if (!isObject(data) || !Array.isArray(data.results)) {
      candidates.forEach(source=>source.extractionFailure='invalid_response');
      return ['Tavily page extraction returned an invalid response; retained search snippets remain the only available source text.'];
    }

    const byUrl=new Map(candidates.map(source=>[canonicalURL(source.url),source]));
    const extractedURLs=new Set<string>();
    for (const result of data.results) {
      if (!isObject(result) || !text(result.url,3000) || !text(result.raw_content,100_000)) continue;
      const requested=canonicalURL(result.url);
      const source=requested ? byUrl.get(requested) : undefined;
      const content=result.raw_content.trim().slice(0,MAX_EXTRACTED_CHARS);
      if (!source || content.length<12) continue;
      source.snippet=content;
      source.contentHash=createHash('sha256').update(content,'utf8').digest('hex');
      source.retrieval='provider_extract';
      source.extractedAt=extractedAt;
      source.extractionStatus='extracted';
      source.extractionFailure=undefined;
      extractedURLs.add(source.url);
    }

    if (Array.isArray(data.failed_results)) {
      for (const item of data.failed_results) {
        if (!isObject(item) || !text(item.url,3000)) continue;
        const requested=canonicalURL(item.url);
        const source=requested ? byUrl.get(requested) : undefined;
        if (source) source.extractionFailure='unavailable';
      }
    }
    const failed=candidates.filter(source=>!extractedURLs.has(source.url));
    if (failed.length) warning=`Page extraction failed or returned no text for ${failed.length} selected source(s); search snippets were retained as fallback.`;
  } catch {
    if (signal?.aborted) throw new ProviderError('The analysis deadline was exceeded.',504,'ANALYSIS_TIMEOUT',true);
    candidates.forEach(source=>source.extractionFailure=timeout.aborted?'timed_out':'unavailable');
    warning=timeout.aborted
      ? 'Tavily page extraction timed out; retained search snippets remain the only available source text.'
      : 'Tavily page extraction was unavailable; retained search snippets remain the only available source text.';
  }
  return warning ? [warning] : [];
}

export async function tavilySearch(query:string,maxResults=5,signal?:AbortSignal,preferredDomains:string[]=[]):Promise<TavilyResult[]> {
  const key=process.env.TAVILY_API_KEY;
  const timeout=signal ? AbortSignal.any([signal,AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000);
  try {
    const response=await fetch('https://api.tavily.com/search',{
      method:'POST',signal:timeout,headers:{'Content-Type':'application/json',...(!key ? {'X-Tavily-Access-Mode':'keyless'} : {})},
      body:JSON.stringify({...(key ? {api_key:key} : {}),query,max_results:Math.min(5,Math.max(1,maxResults)),search_depth:'basic',include_answer:false,include_images:false,include_raw_content:false,...(preferredDomains.length ? {include_domains:preferredDomains.slice(0,10)} : {})}),
    });
    if (response.status===429) throw new ProviderError(key?'Tavily research reached its configured rate limit.':'Tavily keyless research is rate-limited. Add TAVILY_API_KEY for a predictable quota or retry later.',429,'RESEARCH_RATE_LIMITED',true);
    if (!response.ok) throw new ProviderError('Research is temporarily unavailable.',502,'RESEARCH_UNAVAILABLE',true);
    const data:unknown=await response.json();
    if (!isObject(data) || !Array.isArray(data.results)) throw new ProviderError('Research returned an invalid response.',502,'INVALID_RESEARCH_RESPONSE',true);
    return data.results.slice(0,5).filter((result):result is TavilyResult => isObject(result) && text(result.url,3000) && safeSourceURL(result.url) && text(result.title,1000) && text(result.content,100_000)).map(result => ({url:result.url,title:result.title,content:result.content.slice(0,6000)}));
  } catch (error) {
    if (signal?.aborted) throw new ProviderError('The analysis deadline was exceeded.',504,'ANALYSIS_TIMEOUT',true);
    if (timeout.aborted) throw new ProviderError('A web research search timed out. Evidence coverage may be incomplete.',504,'RESEARCH_TIMEOUT',true);
    if (error instanceof ProviderError) throw error;
    throw new ProviderError('Research is temporarily unavailable.',502,'RESEARCH_UNAVAILABLE',true);
  }
}

export async function researchWithWarnings(queries:ResearchQuery[],signal?:AbortSignal,preferredDomains:string[]=[]):Promise<{sources:Source[];warnings:string[]}> {
  const bounded=queries.slice(0,6);
  const results:{query:ResearchQuery;results:TavilyResult[];failed:boolean;rateLimited?:boolean;timedOut?:boolean}[]=[];
  // Three requests at a time; preserving input order keeps IDs deterministic.
  for (let offset=0;offset<bounded.length;offset+=3) {
    const batch=await Promise.all(bounded.slice(offset,offset+3).map(async query => {
      try { return {query,results:await tavilySearch(query.query,5,signal,preferredDomains),failed:false}; }
      catch (error) {
        if (signal?.aborted || error instanceof ProviderError && error.status===503) throw error;
        return {query,results:[],failed:true,rateLimited:error instanceof ProviderError&&error.code==='RESEARCH_RATE_LIMITED',timedOut:error instanceof ProviderError&&error.code==='RESEARCH_TIMEOUT'};
      }
    }));
    results.push(...batch);
  }
  const sources:Source[]=[];
  const registry=new Map<string,Source>();
  const warnings:string[]=[];
  const retrievedAt=new Date().toISOString();
  for (const entry of results) {
    if (entry.failed) warnings.push(entry.timedOut?'A research search timed out. Evidence coverage may be incomplete.':entry.rateLimited&&!process.env.TAVILY_API_KEY?'Tavily keyless access reached its rate limit. Add TAVILY_API_KEY for a predictable quota or retry later; evidence coverage is incomplete.':entry.rateLimited?'Tavily reached its configured rate limit. Retry later; evidence coverage is incomplete.':'A research search was unavailable. Evidence coverage may be incomplete.');
    for (const item of entry.results) {
      const canonical=new URL(item.url);canonical.hash='';
      const url=canonical.toString();
      const existing=registry.get(url);
      if (existing) {
        existing.queries=[...new Set([...(existing.queries ?? []),entry.query.query])];
        if (item.content.length>existing.snippet.length) {
          existing.snippet=item.content;
          existing.contentHash=createHash('sha256').update(item.content,'utf8').digest('hex');
        }
        continue;
      }
      const kind=['rules','company policy','similar cases'].includes(entry.query.targets) ? entry.query.targets as NonNullable<Source['kind']> : 'rules';
      const source:Source={
        id:`s${sources.length+1}`,url,title:item.title,snippet:item.content,retrievedAt,
        retrieval:'search_snippet',authority:'unreviewed',jurisdiction:'unknown',freshness:'unknown',
        publisher:new URL(url).hostname,
        // This fingerprint identifies the retained snippet only. It does not verify the page or publisher.
        contentHash:createHash('sha256').update(item.content,'utf8').digest('hex'),
        kind,queries:[entry.query.query],
      };
      sources.push(source);registry.set(url,source);
    }
  }
  warnings.push(...await extractCandidatePages(sources,bounded,signal));
  if (!sources.length && !warnings.length) warnings.push('Research returned no usable sources. No source-backed eligibility can be established.');
  return {sources,warnings:[...new Set(warnings)]};
}

export async function researchQueries(queries:ResearchQuery[],signal?:AbortSignal):Promise<Source[]> {
  return (await researchWithWarnings(queries,signal)).sources;
}
