import { factLabel } from './fact-labels';
export interface DocumentAudit {
  records:{label:string;value:string;documentId:string;documentLabel:string;excerpt:string}[];
  companyReply:string;
}
/** Document excerpts are attributed, not evaluated as independently true. */
export function buildDocumentAudit(args: {facts:Record<string,unknown>;factEvidence:Record<string,{documentId:string;label:string;excerpts:string[]}>;companyResponse:string}):DocumentAudit {
  const records=Object.entries(args.factEvidence).flatMap(([key,evidence])=>{
    const value=args.facts[key];
    if (value == null || !evidence.excerpts.length || key==='companyPosition') return [];
    return [{label:factLabel(key),value:Array.isArray(value)?value.join('; '):String(value),documentId:evidence.documentId,documentLabel:evidence.label,excerpt:evidence.excerpts[0]}];
  });
  return {records,companyReply:args.companyResponse.slice(0,12000)};
}
