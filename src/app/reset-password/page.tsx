import { SiteShell } from "@/components/SiteShell";
import { AccountForm } from "@/components/AccountForms";

export default function ResetPasswordPage() {
  return <SiteShell><section className="account-page reset-page"><div className="account-copy"><p className="eyebrow">Account recovery</p><h1>A fresh start for your password.</h1><p>Enter your account email and we’ll send a secure reset link if it matches an account.</p></div><div className="account-form-panel"><h2>Reset password</h2><AccountForm mode="reset-password" /></div></section></SiteShell>;
}
