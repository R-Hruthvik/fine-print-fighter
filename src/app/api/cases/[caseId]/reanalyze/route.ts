import { NextResponse } from "next/server";
import { getPack } from "@/lib/packs";
import { runPipeline } from "@/lib/pipeline";
import { createClient } from "@/lib/supabase/server";
import { takeBudget, RequestError, errorResponse } from "@/lib/request";
import { enforceSharedAnalysisBudget } from "@/lib/shared-budget";
import { normalizeScopeAnswers, scopeAnswersToInput } from "@/lib/scope-answers";

type Context = { params: Promise<{ caseId: string }> };
export const maxDuration = 120;
const localBudget = new Map<string, { count: number; expires: number }>();
let activeReanalyses = 0;

export async function POST(_request: Request, { params }: Context) {
  let supabase;
  try { supabase = await createClient(); } catch { return NextResponse.json({ error: "Private case storage is not configured." }, { status: 503 }); }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to reanalyze a saved case." }, { status: 401 });
  const { caseId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(caseId)) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  const { data: savedCase, error: readError } = await supabase.from("cases").select("id, company_name, pack_id, jurisdiction, documents, analysis").eq("id", caseId).maybeSingle();
  if (readError) return NextResponse.json({ error: "Saved case could not be loaded." }, { status: 500 });
  if (!savedCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  const pack = getPack(savedCase.pack_id);
  if (!pack || !Array.isArray(savedCase.documents)) return NextResponse.json({ error: "This saved case cannot be reanalyzed." }, { status: 422 });
  const docs = savedCase.documents as { label?: unknown; text?: unknown }[];
  if (!docs.every((doc) => typeof doc.label === "string" && typeof doc.text === "string")) return NextResponse.json({ error: "Saved document data is invalid." }, { status: 422 });
  const primary = docs.find((doc) => doc.label === "Primary document") ?? docs[0];
  const reply = docs.find((doc) => doc.label === "Company response");
  const additionalDocuments = docs.filter((doc) => doc !== primary && doc !== reply).map((doc, index) => ({ id: `saved-${index + 1}`, label: doc.label as string, text: doc.text as string }));
  const previousAnalysis = savedCase.analysis && typeof savedCase.analysis === "object" && !Array.isArray(savedCase.analysis)
    ? savedCase.analysis as Record<string, unknown> : {};
  let scopeAnswers;
  try { scopeAnswers = normalizeScopeAnswers(pack.id, scopeAnswersToInput(previousAnalysis.scopeAnswers, pack.id)); }
  catch { scopeAnswers = normalizeScopeAnswers(pack.id); }
  if (activeReanalyses >= 3) return NextResponse.json({ error: "The server is handling its maximum number of analyses. Try again shortly." }, { status: 429, headers: { "Retry-After": "60" } });
  activeReanalyses++;
  try {
    if (process.env.NODE_ENV === "production") await enforceSharedAnalysisBudget(_request);
    else if (!takeBudget(localBudget, "case-reanalysis", Date.now(), 8)) throw new RequestError(429, "RATE_LIMITED", "Too many saved-case analyses. Please wait before trying again.", true);
    const analysis = await runPipeline({
      documentText: primary.text as string, companyResponse: (reply?.text as string | undefined) ?? "",
      additionalDocuments, pack, country: savedCase.jurisdiction as "IN" | "EU" | "US", companyName: savedCase.company_name,
      scopeAnswers,
      desiredOutcome: `Review my complaint about ${savedCase.company_name}.`,
    });
    // The database function archives and replaces this case atomically under
    // the current user's RLS context. A failed update cannot create a duplicate
    // history snapshot or lose the editable prior letter.
    const { data: saved, error: saveError } = await supabase.rpc("save_case_reanalysis", {
      p_case_id: caseId,
      p_analysis: analysis,
      p_letter: analysis.letter,
    });
    if (saveError) {
      console.error("[saved-case-reanalysis-save]", saveError);
      return NextResponse.json({ error: "Analysis completed but could not be saved. The previous analysis is unchanged." }, { status: 500 });
    }
    if (saved !== true) return NextResponse.json({ error: "Case not found." }, { status: 404 });
    return NextResponse.json({ analysis }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RequestError) return errorResponse(error, crypto.randomUUID());
    console.error("[saved-case-reanalysis]", error);
    return NextResponse.json({ error: "Analysis could not be completed. Your saved case is unchanged." }, { status: 502 });
  } finally { activeReanalyses--; }
}
