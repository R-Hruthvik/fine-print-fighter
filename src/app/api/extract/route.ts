import { runPipeline } from "../../../lib/pipeline";
import { getPack } from "../../../lib/packs";
import { errorResponse, parseCaseRequest, readJSON, RequestError, takeBudget } from "../../../lib/request";
import { enforceSharedAnalysisBudget } from "../../../lib/shared-budget";
import type { AnalysisProgressEvent } from "../../../lib/types";

export const maxDuration = 120;
const budget = new Map<string, { count: number; expires: number }>();
let active = 0;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let acquired = false;
  try {
    const input = parseCaseRequest(await readJSON(request));
    if (active >= 3) throw new RequestError(429, "RATE_LIMITED", "This server is handling its maximum number of analyses. Please try again shortly.", true);
    active++; acquired = true;
    if (process.env.NODE_ENV === "production") await enforceSharedAnalysisBudget(request);
    else if (!takeBudget(budget, "application", Date.now(), 12)) throw new RequestError(429, "RATE_LIMITED", "Too many analyses. Please wait a minute and try again.", true);
    if (request.headers.get("accept")?.includes("application/x-ndjson")) {
      const streamAbort = new AbortController();
      const abortOnRequest = () => streamAbort.abort(request.signal.reason);
      if (request.signal.aborted) abortOnRequest();
      else request.signal.addEventListener("abort", abortOnRequest, { once: true });
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          let closed = false;
          const send = (value: unknown) => {
            if (closed) return;
            try { controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`)); }
            catch { closed = true; streamAbort.abort("stream disconnected"); }
          };
          const onProgress = (event: AnalysisProgressEvent) => send({ type: "progress", event });
          void (async () => {
            try {
              const result = await runPipeline({ ...input, pack: getPack(input.packId)!, signal: streamAbort.signal, requestId, onProgress });
              console.info("[analysis]", { requestId, durationMs: result.run.durationMs, stages: result.run.stageDurations, sources: result.sources.length, findings: result.findings.length });
              send({ type: "result", result });
            } catch (error) {
              const safe = errorResponse(error, requestId);
              send({ type: "error", status: safe.status, error: await safe.json() });
            } finally {
              closed = true;
              active--;
              request.signal.removeEventListener("abort", abortOnRequest);
              try { controller.close(); } catch { /* The client may have cancelled the stream. */ }
            }
          })();
        },
        cancel(reason) { streamAbort.abort(reason); },
      });
      acquired = false;
      return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
    const result = await runPipeline({ ...input, pack: getPack(input.packId)!, signal: request.signal, requestId });
    console.info("[analysis]", { requestId, durationMs: result.run.durationMs, stages: result.run.stageDurations, sources: result.sources.length, findings: result.findings.length });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, requestId);
  } finally { if (acquired) active--; }
}
