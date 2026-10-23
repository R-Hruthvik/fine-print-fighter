import { runPipeline } from "../../../lib/pipeline";
import { getPack } from "../../../lib/packs";
import { errorResponse, parseCaseRequest, readJSON, RequestError, takeBudget } from "../../../lib/request";

export const maxDuration = 120;
const budget = new Map<string, { count: number; expires: number }>();
let active = 0;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let acquired = false;
  try {
    const input = parseCaseRequest(await readJSON(request));
    if (active >= 3 || !takeBudget(budget, "application", Date.now(), 12)) {
      throw new RequestError(429, "RATE_LIMITED", "Too many analyses. Please wait a minute and try again.", true);
    }
    active++; acquired = true;
    const result = await runPipeline({ ...input, pack: getPack(input.packId)!, signal: request.signal, requestId });
    console.info("[analysis]", { requestId, durationMs: result.run.durationMs, stages: result.run.stageDurations, sources: result.sources.length, findings: result.findings.length });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, requestId);
  } finally { if (acquired) active--; }
}
