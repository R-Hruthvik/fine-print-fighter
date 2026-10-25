import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateSaveCase } from "@/lib/saved-cases";
import { readJSON, RequestError } from "@/lib/request";

function unavailable() {
  return NextResponse.json({ error: "Private case storage is not configured." }, { status: 503 });
}

export async function GET() {
  let supabase;
  try { supabase = await createClient(); } catch { return unavailable(); }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to view saved cases." }, { status: 401 });
  const { data, error } = await supabase.from("cases").select("id, company_name, pack_id, jurisdiction, created_at, updated_at").order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Saved cases could not be loaded." }, { status: 500 });
  return NextResponse.json({ cases: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  let supabase;
  try { supabase = await createClient(); } catch { return unavailable(); }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in before saving a case." }, { status: 401 });
  let input: unknown;
  try { input = await readJSON(request); }
  catch (error) {
    const status = error instanceof RequestError ? error.status : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request body must be valid JSON." }, { status });
  }
  if (!validateSaveCase(input)) return NextResponse.json({ error: "Case details are incomplete or exceed storage limits." }, { status: 400 });
  const { data, error } = await supabase.from("cases").insert({
    owner_id: user.id,
    company_name: input.companyName.trim(), pack_id: input.packId, jurisdiction: input.jurisdiction,
    documents: input.documents, analysis: input.analysis, letter: input.letter,
  }).select("id, company_name, pack_id, jurisdiction, created_at, updated_at").single();
  if (error) return NextResponse.json({ error: "This case could not be saved." }, { status: 500 });
  return NextResponse.json({ case: data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
