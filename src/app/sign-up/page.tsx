import { Suspense } from "react";
import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { AccountForm } from "@/components/AccountForms";

export default function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  return <SiteShell><Suspense fallback={<section className="account-page"><p className="account-message" role="status">Loading account form…</p></section>}><SignUpContent searchParams={searchParams} /></Suspense></SiteShell>;
}

async function SignUpContent({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const requested = (await searchParams).next;
  const next = typeof requested === "string" && requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/\\") ? requested : null;
  const signInHref = next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in";
  return <section className="account-page"><div className="account-copy"><p className="eyebrow">Save your work</p><h1>Your case stays yours.</h1><p>Make an account to keep analysis, source documents, and draft letters together for later review. Saving a case is always an explicit choice.</p><p className="scope-note">No letters are sent and no complaints are filed for you.</p></div><div className="account-form-panel"><h2>Create an account</h2><AccountForm mode="sign-up" nextPath={next} /><p className="account-legal">We’ll send a verification link to your email. By signing up, you agree to use this as an information tool, not legal advice.</p><p className="account-switch">Already have an account? <Link href={signInHref}>Sign in</Link></p></div></section>;
}
