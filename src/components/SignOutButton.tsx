"use client";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
export function SignOutButton() { const router = useRouter(); return <button className="button button-outline" onClick={async () => { const supabase = createClient(); await supabase?.auth.signOut(); router.push("/"); }}>Sign out</button>; }
