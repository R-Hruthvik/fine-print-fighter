import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ caseId: string }> };
export async function GET(_request: Request, { params }: Context) {
  let supabase;
  try { supabase = await createClient(); } catch { return Response.json({ error: "Private case storage is not configured." }, { status: 503 }); }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Sign in to export saved cases." }, { status: 401 });
  const { caseId } = await params;
  const { data, error } = await supabase.from("cases").select("id, company_name, pack_id, jurisdiction, documents, analysis, letter, created_at, updated_at").eq("id", caseId).maybeSingle();
  if (error) return Response.json({ error: "Case could not be exported." }, { status: 500 });
  if (!data) return Response.json({ error: "Case not found." }, { status: 404 });
  return new Response(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="fine-print-case-${caseId}.json"`, "Cache-Control": "private, no-store" } });
}
