import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ caseId: string }> };
function unavailable() { return NextResponse.json({ error: "Private case storage is not configured." }, { status: 503 }); }

async function clientForUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: NextResponse.json({ error: "Sign in to access saved cases." }, { status: 401 }) };
  return { supabase, user };
}

export async function GET(_request: Request, { params }: Context) {
  let ctx;
  try { ctx = await clientForUser(); } catch { return unavailable(); }
  if ("response" in ctx) return ctx.response;
  const { caseId } = await params;
  const { data, error } = await ctx.supabase.from("cases").select("id, company_name, pack_id, jurisdiction, documents, analysis, letter, created_at, updated_at").eq("id", caseId).maybeSingle();
  if (error) return NextResponse.json({ error: "Case could not be loaded." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  return NextResponse.json({ case: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, { params }: Context) {
  let ctx;
  try { ctx = await clientForUser(); } catch { return unavailable(); }
  if ("response" in ctx) return ctx.response;
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!input || typeof input !== "object" || !("analysis" in input) || !("letter" in input) || typeof (input as { letter?: unknown }).letter !== "string") return NextResponse.json({ error: "A new analysis and letter are required." }, { status: 400 });
  const body = input as { analysis: unknown; letter: string };
  if (body.letter.length > 30_000 || JSON.stringify(body.analysis).length > 1_000_000) return NextResponse.json({ error: "Updated analysis is too large." }, { status: 413 });
  const { caseId } = await params;
  const { data, error } = await ctx.supabase.from("cases").update({ analysis: body.analysis, letter: body.letter, updated_at: new Date().toISOString() }).eq("id", caseId).select("id, updated_at").maybeSingle();
  if (error) return NextResponse.json({ error: "Updated analysis could not be saved." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  return NextResponse.json({ case: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(_request: Request, { params }: Context) {
  let ctx;
  try { ctx = await clientForUser(); } catch { return unavailable(); }
  if ("response" in ctx) return ctx.response;
  const { caseId } = await params;
  const { data, error } = await ctx.supabase.from("cases").delete().eq("id", caseId).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Case could not be deleted." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  return new Response(null, { status: 204 });
}
