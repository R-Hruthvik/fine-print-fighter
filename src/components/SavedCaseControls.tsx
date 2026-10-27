"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CaseDeleteButton({ caseId, compact = false }: { caseId: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    if (busy || !window.confirm("Delete this saved case and its original documents? This cannot be undone.")) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("The case could not be deleted. Please try again.");
      if (compact) router.refresh();
      else router.push("/cases");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The case could not be deleted."); }
    finally { setBusy(false); }
  }
  return <span className="case-delete-wrap"><button className={compact ? "text-button case-delete-button" : "secondary-button case-delete-button"} type="button" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete case"}</button>{error ? <span className="case-action-error" role="alert">{error}</span> : null}</span>;
}

export function SavedCaseControls({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function reanalyze() {
    if (busy) return;
    setBusy(true); setError(null); setMessage("Reanalyzing the saved documents. This can take a minute.");
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/reanalyze`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Reanalysis could not be completed.");
      setMessage("Analysis updated from the saved documents.");
      router.refresh();
    } catch (caught) { setMessage(null); setError(caught instanceof Error ? caught.message : "Reanalysis could not be completed."); }
    finally { setBusy(false); }
  }
  return <div className="saved-case-controls"><div className="saved-case-action-buttons"><a className="secondary-button" href={`/api/cases/${encodeURIComponent(caseId)}/export`}>Export case <span aria-hidden="true">↓</span></a><button className="primary-button" type="button" disabled={busy} onClick={() => void reanalyze()}>{busy ? "Reanalyzing…" : "Reanalyze case"}<span aria-hidden="true">→</span></button><CaseDeleteButton caseId={caseId} /></div>{message ? <p role="status" className="feedback notice-feedback">{message}</p> : null}{error ? <p role="alert" className="feedback error-feedback">{error}</p> : null}</div>;
}
