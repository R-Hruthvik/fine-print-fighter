import { parseCaseRequest, readJSON, errorResponse, takeBudget, RequestError } from '@/lib/request';
import { enforceSharedAnalysisBudget } from '@/lib/shared-budget';
import { extractFacts } from '@/lib/llm';
import { getPack } from '@/lib/packs';
const budget = new Map<string, {count:number; expires:number}>();
let active = 0;
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let acquired = false;
  try {
    const input = parseCaseRequest(await readJSON(request));
    if (active >= 3) throw new RequestError(429,'RATE_LIMITED','Please try again shortly.',true);
    if (process.env.NODE_ENV === 'production') await enforceSharedAnalysisBudget(request);
    else if (!takeBudget(budget,'prepare',Date.now(),12)) throw new RequestError(429,'RATE_LIMITED','Please wait a minute before checking again.',true);
    active++; acquired = true;
    const result = await extractFacts(input.documentText,getPack(input.packId)!,AbortSignal.any([request.signal,AbortSignal.timeout(65000)]),true);
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  } catch(error) { return errorResponse(error,requestId); }
  finally { if(acquired) active--; }
}
