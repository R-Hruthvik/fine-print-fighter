"use client";
import { useRouter } from "next/navigation";
export function DeleteAccountButton() { const router = useRouter(); return <button className="button button-danger" onClick={async () => { if (!window.confirm("Permanently delete your account and saved cases? This cannot be undone.")) return; const response = await fetch("/api/account", { method: "DELETE" }); if (response.ok) router.push("/"); else window.alert("Account deletion is not configured. Contact the site administrator."); }}>Delete account</button>; }
