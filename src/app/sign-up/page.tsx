import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { AccountForm } from "@/components/AccountForms";

export default function SignUpPage() {
  return <SiteShell><section className="account-page"><div className="account-copy"><p className="eyebrow">Save your work</p><h1>Your case stays yours.</h1><p>Make an account to keep analysis, source documents, and draft letters together for later review. Saving a case is always an explicit choice.</p><p className="scope-note">No letters are sent and no complaints are filed for you.</p></div><div className="account-form-panel"><h2>Create an account</h2><AccountForm mode="sign-up" /><p className="account-legal">We’ll send a verification link to your email. By signing up, you agree to use this as an information tool, not legal advice.</p><p className="account-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p></div></section></SiteShell>;
}
