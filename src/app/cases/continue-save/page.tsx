"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { clearPendingCaseSave, readPendingCaseSave } from "@/lib/pending-case-save";
import { createClient } from "@/lib/supabase/client";
import { CASE_TYPES, COUNTRIES } from "@/lib/packs";
import type { SaveCaseInput } from "@/lib/saved-cases";

type AuthState = "checking" | "signed-in" | "signed-out" | "unavailable" | "error";

export default function ContinueSavePage() {
  const router = useRouter();
  const [input, setInput] = useState<SaveCaseInput | null>(null);
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Checking for a pending case and your account…");
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadReview = useCallback(async () => {
    setError("");
    setConsent(false);
    let pending: SaveCaseInput | null;
    try {
      pending = readPendingCaseSave();
    } catch {
      pending = null;
    }
    setInput(pending);
    if (!pending) {
      setAuthState("error");
      setMessage("No valid pending case was found. Pending cases expire after one hour and invalid or expired copies are cleared from this browser tab.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setAuthState("unavailable");
      setMessage("Account storage is not configured in this deployment.");
      return;
    }
    setAuthState("checking");
    setMessage("Checking your sign-in…");
    let data: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"];
    let authError: Awaited<ReturnType<typeof supabase.auth.getUser>>["error"];
    try {
      ({ data, error: authError } = await supabase.auth.getUser());
    } catch {
      setAuthState("error");
      setMessage("We could not verify your sign-in. Try again before saving.");
      return;
    }
    if (authError) {
      setAuthState("error");
      setMessage("We could not verify your sign-in. Try again before saving.");
      return;
    }
    if (!data.user) {
      setAuthState("signed-out");
      setMessage("Sign in to review and confirm this save.");
      return;
    }
    setEmail(data.user.email ?? "");
    setAuthState("signed-in");
    setMessage("Review the case summary, then confirm if you still want to save it.");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadReview(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReview]);

  async function saveReviewedCase() {
    if (!input || !consent || authState !== "signed-in" || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; case?: { id?: string } };
      if (response.status === 401) {
        setAuthState("signed-out");
        setMessage("Your sign-in has expired. Sign in again, then return here to review and confirm the save.");
        return;
      }
      if (!response.ok || !payload.case?.id) {
        setError(payload.error || "This case could not be saved. It remains in this browser tab for one hour so you can review and retry.");
        return;
      }
      clearPendingCaseSave();
      setInput(null);
      setMessage("Case saved privately. Opening your saved case…");
      router.replace(`/cases/${payload.case.id}`);
    } catch {
      setError("This case could not be saved. It remains in this browser tab for one hour so you can review and retry.");
    } finally {
      setSaving(false);
    }
  }

  const packName = CASE_TYPES.find((pack) => pack.id === input?.packId)?.label ?? input?.packId;
  const countryName = COUNTRIES.find((country) => country.code === input?.jurisdiction)?.label ?? input?.jurisdiction;

  return <SiteShell><section className="account-page"><div className="account-copy"><p className="eyebrow">Private case storage</p><h1>Review before saving.</h1><p>{message}</p><p>Guest analysis is not saved to your account unless you confirm below. The temporary case copy in this tab expires after one hour.</p></div><div className="account-form-panel"><h2>Save confirmation</h2>{authState === "checking" ? <p className="account-message" role="status">Checking account…</p> : null}{authState === "signed-in" && input ? <>
      <p className="account-message" role="status">Signed in as {email || "your account"}</p>
      <dl className="profile-details"><div><dt>Company</dt><dd>{input.companyName}</dd></div><div><dt>Complaint type</dt><dd>{packName}</dd></div><div><dt>Research jurisdiction</dt><dd>{countryName}</dd></div><div><dt>Documents</dt><dd>{input.documents.length} document{input.documents.length === 1 ? "" : "s"}: {input.documents.map((document) => document.label).join(", ")}</dd></div><div><dt>Draft letter</dt><dd>{input.letter.length.toLocaleString("en-IN")} characters, including your edits</dd></div></dl>
      <p className="account-legal">Confirming stores these original documents, analysis, and edited draft letter privately in your account. Nothing is sent to the company or filed with a regulator.</p>
      <label className="consent-line"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I reviewed this summary and still want to save the complete case.</label>
      {error ? <p className="account-error" role="alert">{error}</p> : null}
      <button className="primary-button" type="button" onClick={() => void saveReviewedCase()} disabled={!consent || saving}>{saving ? "Saving…" : "Save this case"} <span aria-hidden="true">→</span></button>
    </> : null}{authState === "signed-out" ? <><p className="account-message" role="status">{message}</p><p className="account-switch"><Link href="/sign-in?next=%2Fcases%2Fcontinue-save">Sign in</Link> · <Link href="/sign-up?next=%2Fcases%2Fcontinue-save">Create an account</Link></p></> : null}{authState === "unavailable" || authState === "error" ? <p className="account-error" role="alert">{message}</p> : null}<div className="account-switch"><Link href="/cases">Your saved cases</Link> · <Link href="/complaints/new">Start a new complaint</Link>{authState === "error" && input ? <> · <button className="text-button" type="button" onClick={() => void loadReview()}>Check again</button></> : null}</div></div></section></SiteShell>;
}
