import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { ProfilePanel } from "@/components/AccountForms";

export default function ProfilePage() {
  return <SiteShell><section className="account-page profile-page"><div className="account-copy"><p className="eyebrow">Account settings</p><h1>Your account, in your hands.</h1><p>Review your saved work, manage your session, and choose what to keep.</p></div><div className="account-form-panel"><h2>Profile</h2><ProfilePanel /><div className="profile-privacy"><h3>Private by design</h3><p>Saved cases are private to your account. Guest analysis is not stored as a saved case.</p><Link href="/cases">Go to saved cases <span aria-hidden="true">→</span></Link></div></div></section></SiteShell>;
}
