import { Suspense } from "react";
import { SiteShell } from "@/components/SiteShell";
import { AccountForm } from "@/components/AccountForms";

export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  return <SiteShell><Suspense fallback={<section className="account-page reset-page"><p className="account-message" role="status">Loading account recovery…</p></section>}><ResetPasswordContent searchParams={searchParams} /></Suspense></SiteShell>;
}

async function ResetPasswordContent({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const requested = (await searchParams).next;
  const next = typeof requested === "string" && requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/\\") ? requested : null;
  return <section className="account-page reset-page"><div className="account-copy"><p className="eyebrow">Account recovery</p><h1>A fresh start for your password.</h1><p>Enter your account email and we’ll send a secure reset link if it matches an account.</p></div><div className="account-form-panel"><h2>Reset password</h2><AccountForm mode="reset-password" nextPath={next} /></div></section>;
}
