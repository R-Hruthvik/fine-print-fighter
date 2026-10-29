import { extractFacts } from './llm';
import type { ExtractedFactResult, RulePack } from './types';

/** Extract each supplied record separately so matched excerpts retain document identity. */
export async function extractWorkspaceRecords(documents:{id:string;label:string;text:string}[], pack:RulePack, signal?:AbortSignal):Promise<ExtractedFactResult> {
  const result:ExtractedFactResult={facts:{},evidence:{}};
  for (const doc of documents) {
    const extracted=await extractFacts(doc.text,pack,signal,true);
    for (const [key,value] of Object.entries(extracted.facts)) {
      const anchor=extracted.evidence[key];
      if (!anchor || result.evidence[key] || value == null || Array.isArray(value) && !value.length) continue;
      result.facts[key]=value;
      result.evidence[key]={...anchor,documentId:doc.id,label:doc.label};
    }
  }
  return result;
}
