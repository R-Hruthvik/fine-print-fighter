import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function DELETE() {
  let supabase;
  try { supabase = await createClient(); } catch { return NextResponse.json({ error: "Account deletion is not configured." }, { status: 503 }); }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in before deleting your account." }, { status: 401 });
  let admin;
  try { admin = createAdminClient(); } catch { return NextResponse.json({ error: "Account deletion is not configured on the server." }, { status: 503 }); }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Account could not be deleted." }, { status: 500 });
  await supabase.auth.signOut();
  return new Response(null, { status: 204 });
}
