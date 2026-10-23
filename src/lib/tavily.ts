import type { Source } from './types';
import { isObject, ProviderError, text } from './provider';
import { safeSourceURL } from './evidence';

export interface TavilyResult {url:string;title:string;content:string}
export interface ResearchQuery {query:string;targets:string}

export async function tavilySearch(query:string,maxResults=5,signal?:AbortSignal,preferredDomains:string[]=[]):Promise<TavilyResult[]> {
  const key=process.env.TAVILY_API_KEY;
  if (!key) throw new ProviderError('Research is not configured on the server.',503,'CONFIGURATION_MISSING',false);
  const timeout=signal ? AbortSignal.any([signal,AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000);
  try {
    const response=await fetch('https://api.tavily.com/search',{
      method:'POST',signal:timeout,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({api_key:key,query,max_results:Math.min(5,Math.max(1,maxResults)),search_depth:'basic',include_answer:false,include_images:false,include_raw_content:false,...(preferredDomains.length ? {include_domains:preferredDomains.slice(0,10)} : {})}),
    });
    if (!response.ok) throw new ProviderError('Research is temporarily unavailable.',502,'RESEARCH_UNAVAILABLE',true);
    const data:unknown=await response.json();
    if (!isObject(data) || !Array.isArray(data.results)) throw new ProviderError('Research returned an invalid response.',502,'INVALID_RESEARCH_RESPONSE',true);
    return data.results.slice(0,5).filter((result):result is TavilyResult => isObject(result) && text(result.url,3000) && safeSourceURL(result.url) && text(result.title,1000) && text(result.content,100_000)).map(result => ({url:result.url,title:result.title,content:result.content.slice(0,6000)}));
  } catch (error) {
    if (signal?.aborted) throw new ProviderError('The analysis deadline was exceeded.',504,'ANALYSIS_TIMEOUT',true);
    if (error instanceof ProviderError) throw error;
    throw new ProviderError('Research is temporarily unavailable.',502,'RESEARCH_UNAVAILABLE',true);
  }
}

export async function researchWithWarnings(queries:ResearchQuery[],signal?:AbortSignal,preferredDomains:string[]=[]):Promise<{sources:Source[];warnings:string[]}> {
  if (!process.env.TAVILY_API_KEY) throw new ProviderError('Research is not configured on the server.',503,'CONFIGURATION_MISSING',false);
  const bounded=queries.slice(0,6);
  const results:{query:ResearchQuery;results:TavilyResult[];failed:boolean}[]=[];
  // Three requests at a time; preserving input order keeps IDs deterministic.
  for (let offset=0;offset<bounded.length;offset+=3) {
    const batch=await Promise.all(bounded.slice(offset,offset+3).map(async query => {
      try { return {query,results:await tavilySearch(query.query,5,signal,preferredDomains),failed:false}; }
      catch (error) {
        if (signal?.aborted || error instanceof ProviderError && error.status===503) throw error;
        return {query,results:[],failed:true};
      }
    }));
    results.push(...batch);
  }
  const sources:Source[]=[];
  const registry=new Map<string,Source>();
  const warnings:string[]=[];
  const retrievedAt=new Date().toISOString();
  for (const entry of results) {
    if (entry.failed) warnings.push('A research search was unavailable. Evidence coverage may be incomplete.');
    for (const item of entry.results) {
      const canonical=new URL(item.url);canonical.hash='';
      const url=canonical.toString();
      const existing=registry.get(url);
      if (existing) {
        existing.queries=[...new Set([...(existing.queries ?? []),entry.query.query])];
        if (item.content.length>existing.snippet.length) existing.snippet=item.content;
        continue;
      }
      const kind=['rules','company policy','similar cases'].includes(entry.query.targets) ? entry.query.targets as NonNullable<Source['kind']> : 'rules';
      const source:Source={id:`s${sources.length+1}`,url,title:item.title,snippet:item.content,retrievedAt,kind,queries:[entry.query.query]};
      sources.push(source);registry.set(url,source);
    }
  }
  if (!sources.length && !warnings.length) warnings.push('Research returned no usable sources. No source-backed eligibility can be established.');
  return {sources,warnings:[...new Set(warnings)]};
}

export async function researchQueries(queries:ResearchQuery[],signal?:AbortSignal):Promise<Source[]> {
  return (await researchWithWarnings(queries,signal)).sources;
}
