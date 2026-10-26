"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type AccountMode = "sign-in" | "sign-up" | "reset-password";
const subscribeToLocation = () => () => {};
const getCallbackMessage = () => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("message")?.slice(0, 200) ?? "";

export function AccountForm({ mode }: { mode: AccountMode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [recoverySession, setRecoverySession] = useState(false);
  const supabase = createClient();
  const callbackMessage = useSyncExternalStore(subscribeToLocation, getCallbackMessage, () => "");

  useEffect(() => {
    if (!supabase || mode !== "reset-password") return;
    void supabase.auth.getSession().then(({ data }) => setRecoverySession(Boolean(data.session)));
  }, [mode, supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!supabase) { setError("Account access is not configured yet. Case analysis still works without an account."); return; }
    setWorking(true);
    try {
      if (mode === "sign-in") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        const requested = new URLSearchParams(window.location.search).get("next");
        router.push(requested?.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/\\") ? requested : "/cases");
      } else if (mode === "sign-up") {
        const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fprofile` } });
        if (authError) throw authError;
        setMessage(data.session ? "Your account is ready. You can now save cases." : "Check your email to verify your account before signing in.");
      } else if (recoverySession) {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage("Password updated. You can now sign in with your new password.");
        setPassword("");
      } else {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=%2Freset-password` });
        if (authError) throw authError;
        setMessage("If an account uses that email, a password reset link is on its way.");
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "That account request could not be completed."); }
    finally { setWorking(false); }
  }

  const askPassword = mode !== "reset-password" || recoverySession;
  const visibleError = error || (mode === "sign-in" ? callbackMessage : "");
  return <form className="account-form" onSubmit={submit}>
    {mode !== "reset-password" || !recoverySession ? <label htmlFor="account-email">Email address<input id="account-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label> : null}
    {askPassword ? <label htmlFor="account-password">{recoverySession ? "New password" : "Password"}<input id="account-password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label> : null}
    {visibleError ? <p className="account-error" role="alert">{visibleError}</p> : null}
    {message ? <p className="account-message" role="status">{message}</p> : null}
    <button className="primary-button" disabled={working} type="submit">{working ? "Working…" : mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : recoverySession ? "Update password" : "Send reset link"}<span aria-hidden="true">→</span></button>
    {mode === "sign-in" ? <p className="account-switch"><Link href="/reset-password">Forgot your password?</Link></p> : null}
  </form>;
}

export function ProfilePanel() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(() => Boolean(supabase));
  const [lookupError, setLookupError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data, error }) => {
      setEmail(data.user?.email ?? null);
      if (error) setLookupError("Your session could not be checked. Try refreshing the page.");
    }).finally(() => setChecking(false));
  }, [supabase]);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/");
  }
  async function deleteAccount() {
    if (!window.confirm("Delete your account and all saved cases? This cannot be undone.")) return;
    setMessage("");
    const response = await fetch("/api/account", { method: "DELETE" });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Account deletion could not be completed. Your account is still active.");
      return;
    }
    await supabase?.auth.signOut();
    router.push("/");
  }

  if (!supabase) return <p className="account-message" role="status">Supabase Auth is not configured in this deployment. Guest analysis remains available; saved cases require an account.</p>;
  if (checking) return <p className="account-message" role="status">Checking your session…</p>;
  if (lookupError) return <p className="account-error" role="alert">{lookupError}</p>;
  if (!email) return <div className="account-panel"><p>You’re signed out.</p><Link className="primary-button" href="/sign-in">Sign in to your account <span aria-hidden="true">→</span></Link></div>;
  return <div className="account-panel"><dl className="profile-details"><div><dt>Email</dt><dd>{email}</dd></div><div><dt>Saved cases</dt><dd><Link href="/cases">Review your cases</Link></dd></div></dl><div className="profile-actions"><button type="button" className="secondary-button" onClick={() => void signOut()}>Sign out</button><button type="button" className="text-button danger-link" onClick={() => void deleteAccount()}>Delete account</button></div>{message ? <p className="account-error" role="alert">{message}</p> : null}</div>;
}
