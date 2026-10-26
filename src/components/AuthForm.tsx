"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Mode = "sign-in" | "sign-up" | "reset" | "update-password";
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setMessage(""); const supabase = createClient(); if (!supabase) { setMessage("Accounts are not configured yet. You can still use anonymous complaint analysis."); setBusy(false); return; } const data = new FormData(event.currentTarget); const email = String(data.get("email") ?? ""); const password = String(data.get("password") ?? "");
    try {
      if (mode === "sign-in") { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; router.push("/profile"); }
      if (mode === "sign-up") { const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile` } }); if (error) throw error; setMessage("Check your email for a verification link. Your account is ready after verification."); }
      if (mode === "reset") { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password/update` }); if (error) throw error; setMessage("If an account uses that address, we sent a password reset link."); }
      if (mode === "update-password") { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; setMessage("Password updated. You can continue to your profile."); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "We could not complete that request. Please try again."); } finally { setBusy(false); }
  }
  const titles: Record<Mode, string> = { "sign-in": "Welcome back.", "sign-up": "Create your account.", reset: "Reset your password.", "update-password": "Choose a new password." };
  return <><h1>{titles[mode]}</h1><p className="page-intro">{mode === "sign-up" ? "Save complete cases and return to them later." : mode === "reset" ? "We’ll email a secure link if an account matches." : "Your complaint analysis remains available without an account."}</p><form className="auth-form" onSubmit={submit}>{(mode === "sign-in" || mode === "sign-up" || mode === "reset") && <label>Email address<input name="email" type="email" autoComplete="email" required /></label>}{(mode === "sign-in" || mode === "sign-up" || mode === "update-password") && <label>{mode === "update-password" ? "New password" : "Password"}<input name="password" type="password" minLength={8} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required /></label>}<button className="button button-primary" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : mode === "reset" ? "Send reset link" : "Update password"} ↗</button></form>{message && <p className="form-message" role="status">{message}</p>}{mode === "sign-in" && <p className="auth-switch"><Link href="/reset-password">Forgot password?</Link><br />New here? <Link href="/sign-up">Create an account</Link></p>}{mode === "sign-up" && <p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p>}</>;
}
