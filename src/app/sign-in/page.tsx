import { Suspense } from "react";
import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { AccountForm } from "@/components/AccountForms";

export default function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  return <SiteShell><Suspense fallback={<section className="account-page"><p className="account-message" role="status">Loading sign-in…</p></section>}><SignInContent searchParams={searchParams} /></Suspense></SiteShell>;
}

async function SignInContent({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const requested = (await searchParams).next;
  const next = typeof requested === "string" && requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/\\") ? requested : null;
  const signUpHref = next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up";
  return <section className="account-page"><div className="account-copy"><p className="eyebrow">Your account</p><h1>Pick up where you left off.</h1><p>Sign in to review saved cases. You can still analyze a complaint as a guest.</p><p className="account-switch">New here? <Link href={signUpHref}>Create an account</Link></p></div><div className="account-form-panel"><h2>Sign in</h2><AccountForm mode="sign-in" nextPath={next} /></div></section>;
}
