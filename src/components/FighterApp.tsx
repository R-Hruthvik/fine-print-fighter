"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Country, PipelineResult } from "@/lib/types";
import { CASE_TYPES, COUNTRIES } from "@/lib/packs";
import { MAX_DOCUMENT_CHARACTERS, MAX_FILE_BYTES, validateDocument, validateTextFile } from "./workflow";
import { CaseResult } from "./CaseResult";

type FormState = {
  country: Country;
  caseType: string;
  documentText: string;
  companyResponse: string;
  userName: string;
  desiredOutcome: string;
  language: string;
  replyDeadline: string;
};

const DEFAULT_FORM: FormState = {
  country: "IN", caseType: "subscription-cancel", documentText: "", companyResponse: "", userName: "",
  desiredOutcome: "", language: "English", replyDeadline: "14 days",
};

const SAMPLE = "FICTIONAL SAMPLE — SUBSCRIPTION BILLING DISPUTE\n\nCompany: Example Streaming\nPlan: Monthly subscription, INR 499 per month\n\nI requested cancellation through the support chat on 5 October 2026. The reply said: ‘Your request has been received. Our billing team will review it.’\n\nMy payment statement shows another charge of INR 499 on 12 October 2026. I have not received confirmation that the subscription has ended. I would like confirmation of cancellation and a review of the latest charge.\n\nThis is a fictional example for trying the form. No company policy or legal eligibility has been established.";

export function FighterApp() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [additionalDocuments, setAdditionalDocuments] = useState<{ id: string; label: string; text: string }[]>([]);
  const [resultRevision, setResultRevision] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const resultHeading = useRef<HTMLDivElement>(null);

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (result) resultHeading.current?.focus();
  }, [result]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function upload(file: File) {
    setError(null);
    setNotice(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("Your file exceeds 256 KiB. Choose a smaller text file.");
      return;
    }
    try {
      const text = await file.text();
      const validation = validateTextFile(file.name, file.type, file.size, text);
      if (validation) { setError(validation); return; }
      update("documentText", text);
      setFileName(file.name);
      setNotice(`Loaded ${file.name}. Review the text below before analyzing.`);
    } catch { setError("The file could not be read. Try another text file or paste the text."); }
    finally { if (fileRef.current) fileRef.current.value = ""; }
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAnalysis([]);
  }

  async function recheck(documents: { id: string; label: string; text: string }[]) {
    const merged = [...additionalDocuments];
    for (const document of documents) {
      const index = merged.findIndex((existing) => existing.id === document.id);
      if (index < 0) merged.push(document);
      else merged[index] = document;
    }
    if (merged.reduce((total, document) => total + document.text.length, 0) > 30_000) {
      setError("The combined additional evidence exceeds 30,000 characters. Shorten the added document before rechecking.");
      return;
    }
    await submitAnalysis(merged);
  }

  async function submitAnalysis(documents: { id: string; label: string; text: string }[]) {
    if (requestRef.current) return;
    const validation = validateDocument(form.documentText);
    if (validation) { setError(validation); return; }
    if (!form.companyResponse.trim()) { setError("Paste the company’s rejection or reply so the Rebuttal Lab can investigate its explanation."); return; }
    if (form.companyResponse.length > 12_000) { setError("The company response exceeds 12,000 characters. Shorten it before analyzing."); return; }
    if (!CASE_TYPES.some((pack) => pack.id === form.caseType) || !COUNTRIES.some((country) => country.code === form.country)) {
      setError("Choose a supported jurisdiction and case type.");
      return;
    }
    setError(null);
    setNotice(null);
    setRunning(true);
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 125_000);
    try {
      const response = await fetch("/api/extract", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ ...form, additionalDocuments: documents, packId: form.caseType, userName: form.userName || undefined, desiredOutcome: form.desiredOutcome || undefined }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof data?.error === "string" ? data.error : "Analysis could not be completed. Please try again.";
        throw new Error(`${message}${typeof data?.requestId === "string" ? ` Reference: ${data.requestId}` : ""}`);
      }
      if (!data?.score || !Array.isArray(data.findings) || !Array.isArray(data.sources) || typeof data.letter !== "string") {
        throw new Error("The analysis response was incomplete. Your text is still here; please try again.");
      }
      if (!controller.signal.aborted) {
        setAdditionalDocuments(documents);
        setResult(data as PipelineResult);
        setResultRevision((previous) => previous + 1);
      }
    } catch (caught) {
      if (controller.signal.aborted) {
        if (controller.signal.reason === "timeout") setError("The analysis took too long. Your text is still here; please try again.");
        else setNotice("Analysis canceled. Your document text has been kept.");
      } else setError(caught instanceof Error ? caught.message : "Analysis failed. Your text has been kept.");
    } finally {
      clearTimeout(timeout);
      requestRef.current = null;
      setRunning(false);
    }
  }

  function reset() {
    requestRef.current?.abort();
    setForm({ ...DEFAULT_FORM });
    setResult(null);
    setError(null);
    setNotice(null);
    setFileName(null);
    setAdditionalDocuments([]);
    if (fileRef.current) fileRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  if (result) return <div ref={resultHeading} tabIndex={-1} className="result-focus"><CaseResult key={resultRevision} result={result} onReset={reset} onRecheck={recheck} rechecking={running} recheckError={error} recheckNotice={notice} onCancelRecheck={() => requestRef.current?.abort()} /></div>;

  return (
    <div className="intake-layout screen-only">
      <aside className="intro-column">
        <p className="eyebrow">Make your case</p>
        <h1>Small print.<br />Clear next steps.</h1>
        <p className="intro-copy">A confusing bill. A cancellation that never happened. A flight that didn’t go to plan. Start with the document. We’ll help you find your footing.</p>
        <ol className="process-list" id="how-it-works" aria-label="How it works">
          <li><span className="process-number">01</span><div><strong>Bring the facts</strong><p>Paste a notice, bill, or company email.</p></div></li>
          <li><span className="process-number">02</span><div><strong>See the evidence</strong><p>Review sources, gaps, and both sides of the dispute.</p></div></li>
          <li><span className="process-number">03</span><div><strong>Choose your next step</strong><p>Edit your letter and review escalation options.</p></div></li>
        </ol>
        <div className="scope-note"><span className="small-label">You stay in control</span><p>Nothing is sent or filed for you. This is an information tool, not legal advice.</p></div>
      </aside>

      <section className="intake-panel" aria-labelledby="intake-heading">
        <div className="panel-heading"><div><p className="eyebrow">Your starting point</p><h2 id="intake-heading">Tell us what happened.</h2></div><span className="document-mark" aria-hidden="true">Aa</span></div>
        <form onSubmit={analyze} aria-busy={running}>
          <fieldset disabled={running} className="form-fields">
            <legend className="sr-only">Case details</legend>
            <div className="form-grid">
              <label htmlFor="country">Research jurisdiction<select id="country" value={form.country} onChange={(event) => update("country", event.target.value as Country)}>{COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}</select></label>
              <label htmlFor="case-type">What’s the issue?<select id="case-type" value={form.caseType} onChange={(event) => update("caseType", event.target.value)}>{CASE_TYPES.map((pack) => <option key={pack.id} value={pack.id}>{pack.label}</option>)}</select></label>
            </div>
            <p className="field-hint jurisdiction-hint">The applicable rules may also depend on your route, state, sector, or contract.</p>
            <div className="document-label"><label htmlFor="document-text">Document text <span className="required-note">Required</span></label><button className="text-button" type="button" onClick={() => fileRef.current?.click()}>Upload .txt / .md <span aria-hidden="true">↗</span></button></div>
            <input ref={fileRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="sr-only" tabIndex={-1} aria-label="Upload a text document" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
            <textarea id="document-text" className="document-input" value={form.documentText} onChange={(event) => { update("documentText", event.target.value); setFileName(null); }} aria-describedby="document-hint document-count" placeholder="Paste the bill, notice, or email here. Include dates, charges, and the company’s explanation where available." required />
            <div className="document-meta"><span id="document-hint">{fileName ?? "Text only · No PDF or image support yet"}</span><span id="document-count" className={form.documentText.length > MAX_DOCUMENT_CHARACTERS ? "over-limit" : ""}>{form.documentText.length.toLocaleString("en-IN")} / 30,000 characters</span></div>
            <label htmlFor="company-response" className="company-response-label">Company’s rejection or explanation <span className="required-note">Optional</span></label>
            <textarea id="company-response" className="company-response-input" value={form.companyResponse} onChange={(event) => update("companyResponse", event.target.value)} aria-describedby="company-response-hint" placeholder="Paste the company’s actual reply separately. The Rebuttal Lab will investigate its explanation and identify what evidence is missing." required />
            <p className="field-hint" id="company-response-hint">Use the exact reply where possible. Up to 12,000 characters. An explanation is not proof that the company is right.</p>
            <div className="sample-row"><span>Just looking around?</span><button className="text-button" type="button" onClick={() => { setForm({ ...DEFAULT_FORM, caseType: "subscription-cancel", documentText: SAMPLE, companyResponse: "Your subscription remained active through the next billing date. Our records show that cancellation was not completed before the renewal. We cannot refund the charge." }); setFileName(null); setError(null); setNotice("Fictional sample loaded. The company reply is invented for the example; research results are retrieved live."); }}>Try a fictional example <span aria-hidden="true">→</span></button></div>
            <details className="preferences"><summary>Personalize your letter <span>Optional</span></summary><div className="form-grid preference-fields"><label htmlFor="user-name">Your name<input id="user-name" autoComplete="name" value={form.userName} maxLength={200} onChange={(event) => update("userName", event.target.value)} placeholder="Or leave a placeholder" /></label><label htmlFor="letter-language">Letter language<input id="letter-language" value="English" readOnly aria-describedby="language-hint" /><span className="field-hint" id="language-hint">English is supported in this version.</span></label><label htmlFor="desired-outcome" className="full-width">What would resolve this?<input id="desired-outcome" value={form.desiredOutcome} maxLength={2000} onChange={(event) => update("desiredOutcome", event.target.value)} placeholder="For example, cancel my plan and review the latest charge" /></label><label htmlFor="reply-deadline" className="full-width">Requested reply period<input id="reply-deadline" value={form.replyDeadline} maxLength={100} onChange={(event) => update("replyDeadline", event.target.value)} aria-describedby="reply-hint" /><span className="field-hint" id="reply-hint">A requested response time, not an established legal deadline.</span></label></div></details>
          </fieldset>
          {error ? <div className="feedback error-feedback" role="alert">{error}</div> : null}
          {notice ? <p className="feedback notice-feedback" role="status">{notice}</p> : null}
          {running ? <div className="analysis-status" role="status" aria-live="polite"><span className="activity-indicator" aria-hidden="true" /><div><strong>Building your case analysis…</strong><p>Extracting facts, researching sources, and preparing your letter. This may take up to two minutes.</p></div></div> : null}
          <div className="submission-row"><button className="primary-button" type="submit" disabled={running}>{running ? "Analysis in progress" : "Analyze my case"}<span aria-hidden="true">→</span></button>{running ? <button className="secondary-button" type="button" onClick={() => requestRef.current?.abort()}>Cancel</button> : form.documentText || form.userName ? <button className="text-button clear-button" type="button" onClick={reset}>Clear all details</button> : null}</div>
          <p className="privacy-note">Your document is sent to the model provider (Nebius). Minimized research queries are sent to Tavily. Case content is not saved by this app; provider retention policies may apply. Remove sensitive details you don’t need to share.</p>
        </form>
      </section>
    </div>
  );
}
