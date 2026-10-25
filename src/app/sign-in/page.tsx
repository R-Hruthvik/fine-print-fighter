import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { AccountForm } from "@/components/AccountForms";

export default function SignInPage() {
  return <SiteShell><section className="account-page"><div className="account-copy"><p className="eyebrow">Your account</p><h1>Pick up where you left off.</h1><p>Sign in to review saved cases. You can still analyze a complaint as a guest.</p><p className="account-switch">New here? <Link href="/sign-up">Create an account</Link></p></div><div className="account-form-panel"><h2>Sign in</h2><AccountForm mode="sign-in" /></div></section></SiteShell>;
}
