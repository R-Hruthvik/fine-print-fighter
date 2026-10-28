"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisProgressEvent, Country, PipelineResult } from "@/lib/types";
import type { SaveCaseInput } from "@/lib/saved-cases";
import { clearPendingCaseSave, storePendingCaseSave } from "@/lib/pending-case-save";
import { CASE_TYPES, COUNTRIES } from "@/lib/packs";
import { COMPANIES } from "@/lib/catalog";
import { MAX_DOCUMENT_CHARACTERS, MAX_FILE_BYTES, validateDocument, validateTextFile } from "./workflow";
import { CaseResult } from "./CaseResult";
import { AnalysisProgress } from "./AnalysisProgress";
import { SCOPE_QUESTIONS } from "@/lib/scope-answers";

type FormState = {
  intent: "first-complaint" | "review-reply";
  companyName: string;
  country: Country;
  caseType: string;
  scopeAnswers: Record<string, string>;
  documentText: string;
  companyResponse: string;
  userName: string;
  desiredOutcome: string;
  language: string;
  replyDeadline: string;
};

const DEFAULT_FORM: FormState = {
  intent: "review-reply", companyName: "", country: "IN", caseType: "subscription-cancel", scopeAnswers: {}, documentText: "", companyResponse: "", userName: "",
  desiredOutcome: "", language: "English", replyDeadline: "14 days",
};

const SAMPLE = "FICTIONAL SAMPLE — SUBSCRIPTION BILLING DISPUTE\n\nCompany: Example Streaming\nPlan: Monthly subscription, INR 499 per month\n\nI requested cancellation through the support chat on 5 October 2026. The reply said: ‘Your request has been received. Our billing team will review it.’\n\nMy payment statement shows another charge of INR 499 on 12 October 2026. I have not received confirmation that the subscription has ended. I would like confirmation of cancellation and a review of the latest charge.\n\nThis is a fictional example for trying the form. No company policy or legal eligibility has been established.";

async function readPipelineResponse(response: Response, onProgress: (event: AnalysisProgressEvent) => void): Promise<unknown> {
  if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof data?.error === "string" ? data.error : "Analysis could not be completed. Please try again.";
      throw new Error(`${message}${typeof data?.requestId === "string" ? ` Reference: ${data.requestId}` : ""}`);
    }
    return data;
  }
  if (!response.body) throw new Error("The live analysis stream ended unexpectedly. Your text is still here; please try again.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let result: unknown;
  let receivedResult = false;
  const consumeLine = (line: string) => {
    if (!line.trim()) return;
    let message: Record<string, unknown>;
    try { message = JSON.parse(line) as Record<string, unknown>; }
    catch { throw new Error("The analysis stream returned an invalid update. Your text is still here; please try again."); }
    if (message.type === "progress" && message.event && typeof message.event === "object") onProgress(message.event as AnalysisProgressEvent);
    else if (message.type === "result") { result = message.result; receivedResult = true; }
    else if (message.type === "error") {
      const payload = message.error as { error?: unknown; requestId?: unknown } | undefined;
      const error = typeof payload?.error === "string" ? payload.error : "Analysis could not be completed. Please try again.";
      throw new Error(`${error}${typeof payload?.requestId === "string" ? ` Reference: ${payload.requestId}` : ""}`);
    }
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) consumeLine(line);
      if (done) break;
    }
    if (pending.trim()) consumeLine(pending);
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally { reader.releaseLock(); }
  if (!receivedResult) throw new Error("The live analysis stream ended before a result arrived. Your text is still here; please try again.");
  return result;
}

export function FighterApp({ initialPackId }: { initialPackId?: string }) {
  const router = useRouter();
  const selectedPack = CASE_TYPES.some((pack) => pack.id === initialPackId) ? initialPackId! : DEFAULT_FORM.caseType;
  const [form, setForm] = useState<FormState>(() => ({ ...DEFAULT_FORM, caseType: selectedPack }));
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [editedLetter, setEditedLetter] = useState("");
  const [previousResult, setPreviousResult] = useState<PipelineResult | null>(null);
  const [isFictionalSample, setIsFictionalSample] = useState(false);
  const [progressEvents, setProgressEvents] = useState<AnalysisProgressEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [additionalDocuments, setAdditionalDocuments] = useState<{ id: string; label: string; text: string }[]>([]);
  const [exhibitRemovalPending, setExhibitRemovalPending] = useState(false);
  const [resultRevision, setResultRevision] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [saveRequested, setSaveRequested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [pendingSaveReady, setPendingSaveReady] = useState(false);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const resultHeading = useRef<HTMLDivElement>(null);
  const matchedCompany = COMPANIES.find((company) => company.name.toLowerCase() === form.companyName.trim().toLowerCase());
  const hasCompanyCoverage = Boolean(matchedCompany && matchedCompany.packIds.some((packId) => packId === form.caseType) && matchedCompany.jurisdictions.includes(form.country));

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (result) resultHeading.current?.focus();
  }, [result]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function continueToDocuments() {
    if (!CASE_TYPES.some((pack) => pack.id === form.caseType) || !COUNTRIES.some((country) => country.code === form.country)) {
      setError("Choose a supported jurisdiction and complaint type.");
      return;
    }
    setError(null);
    setStage(2);
  }

  const [preparedFacts, setPreparedFacts] = useState<Record<string, unknown> | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [factsConfirmed, setFactsConfirmed] = useState(false);
  async function reviewCase() {
    const validation = validateDocument(form.documentText);
    if (validation) { setError(validation); return; }
    if (form.intent === "review-reply" && !form.companyResponse.trim()) { setError("Add the company’s actual reply or explanation before reviewing."); return; }
    if (form.companyResponse.length > 12_000) { setError("The company response exceeds 12,000 characters. Shorten it before reviewing."); return; }
    setError(null);
    setPreparing(true);
    setFactsConfirmed(false);
    try {
      const response = await fetch('/api/prepare', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({intent:form.intent,documentText:form.documentText,companyResponse:form.companyResponse,packId:form.caseType,country:form.country})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'We could not read the record. Your text is still here.');
      setPreparedFacts(data.facts);
      setStage(3);
    } catch(error) { setError(error instanceof Error ? error.message : 'We could not check the record.'); }
    finally { setPreparing(false); }
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
    if (form.documentText.length + form.companyResponse.length + merged.reduce((total, document) => total + document.text.length, 0) > 30_000) {
      setError("All case documents together exceed 30,000 characters. Shorten an added document before rechecking.");
      return;
    }
    await submitAnalysis(merged);
  }

  async function submitAnalysis(documents: { id: string; label: string; text: string }[]) {
    if (requestRef.current) return;
    const validation = validateDocument(form.documentText);
    if (validation) { setError(validation); return; }
    if (form.intent === "review-reply" && !form.companyResponse.trim()) { setError("Paste the company’s rejection or reply so the Rebuttal Lab can investigate its explanation."); return; }
    if (form.companyResponse.length > 12_000) { setError("The company response exceeds 12,000 characters. Shorten it before analyzing."); return; }
    if (form.documentText.length + form.companyResponse.length + documents.reduce((total, document) => total + document.text.length, 0) > 30_000) {
      setError("All case documents together exceed 30,000 characters. Shorten one before analyzing.");
      return;
    }
    if (!CASE_TYPES.some((pack) => pack.id === form.caseType) || !COUNTRIES.some((country) => country.code === form.country)) {
      setError("Choose a supported jurisdiction and case type.");
      return;
    }
    setError(null);
    setNotice(null);
    setProgressEvents([]);
    setRunning(true);
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 125_000);
    try {
      const response = await fetch("/api/extract", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson, application/json" }, signal: controller.signal,
        body: JSON.stringify({ ...form, additionalDocuments: documents, packId: form.caseType, scopeAnswers: form.scopeAnswers, userName: form.userName || undefined, desiredOutcome: form.desiredOutcome || undefined }),
      });
      const data = await readPipelineResponse(response, (event) => setProgressEvents((previous) => [...previous, event])) as Partial<PipelineResult> | null;
      if (!data?.score || !Array.isArray(data.findings) || !Array.isArray(data.sources) || typeof data.letter !== "string") {
        throw new Error("The analysis response was incomplete. Your text is still here; please try again.");
      }
      if (!controller.signal.aborted) {
        if (result) setPreviousResult(result);
        setAdditionalDocuments(documents);
        setExhibitRemovalPending(false);
        setProgressEvents([]);
        setResult(data as PipelineResult);
        setEditedLetter(data.letter);
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
    setForm({ ...DEFAULT_FORM, caseType: selectedPack });
    setResult(null);
    setEditedLetter("");
    setPreviousResult(null);
    setIsFictionalSample(false);
    setError(null);
    setNotice(null);
    setProgressEvents([]);
    setFileName(null);
    setAdditionalDocuments([]);
    setExhibitRemovalPending(false);
    setSaveRequested(false);
    setSaveMessage(null);
    clearPendingCaseSave();
    setPendingSaveReady(false);
    setStage(1);
    if (fileRef.current) fileRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  async function saveCase() {
    if (!result || !saveRequested) return;
    if (exhibitRemovalPending) {
      setSaveMessage("Recheck the remaining evidence before saving so the documents match the analysis.");
      return;
    }
    setSaving(true); setSaveMessage(null);
    try {
      const documents = [
        { label: "Primary document", text: form.documentText },
        { label: "Company response", text: form.companyResponse },
        ...additionalDocuments.map((item) => ({ label: item.label, text: item.text })),
      ];
      const letter = editedLetter;
      const input: SaveCaseInput = {
        companyName: form.companyName || "Unlisted company",
        packId: form.caseType,
        jurisdiction: form.country,
        documents,
        analysis: { ...result, letter },
        letter,
      };
      const response = await fetch("/api/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const payload = await response.json().catch(() => ({})) as { error?: string; case?: { id: string } };
      if (response.status === 401) {
        try {
          storePendingCaseSave(input);
          setPendingSaveReady(true);
          setSaveMessage("Sign in to finish saving. Your case is held in this browser tab only until you complete sign-in.");
        } catch {
          setPendingSaveReady(false);
          setSaveMessage("Sign in to save this case, but this browser could not hold the case for you. Keep this page open, sign in in another tab, then choose Save case again.");
        }
        return;
      }
      if (!response.ok) throw new Error(payload.error || "This case could not be saved.");
      clearPendingCaseSave();
      setPendingSaveReady(false);
      setSaveMessage("Case saved privately to your account.");
      if (payload.case?.id) window.setTimeout(() => router.push(`/cases/${payload.case?.id}`), 500);
    } catch (caught) { setSaveMessage(caught instanceof Error ? caught.message : "This case could not be saved."); }
    finally { setSaving(false); }
  }

  if (result) return <div ref={resultHeading} tabIndex={-1} className="result-focus">
      <details className="save-case-disclosure"><summary>Save this case to your account</summary><section className="save-case-panel" aria-label="Save case">
      <label className="save-case-choice"><input type="checkbox" checked={saveRequested} onChange={(event) => { const checked = event.target.checked; setSaveRequested(checked); setSaveMessage(null); if (!checked) { clearPendingCaseSave(); setPendingSaveReady(false); } }} /> Save the complete case to my private account</label>
      <p>Optional. Includes the documents, analysis, and draft letter. Nothing is saved unless you check this box and choose Save case.</p>
      <button className="secondary-button" type="button" disabled={!saveRequested || saving || exhibitRemovalPending} onClick={() => void saveCase()}>{saving ? "Saving…" : "Save case"}<span aria-hidden="true">→</span></button>
      {exhibitRemovalPending ? <p className="save-case-message">Recheck the remaining evidence before saving so the saved documents and analysis stay aligned.</p> : null}
      {saveMessage ? <p className="save-case-message" role="status">{saveMessage}{pendingSaveReady ? <> <a href="/sign-in?next=%2Fcases%2Fcontinue-save">Sign in</a> or <a href="/sign-up?next=%2Fcases%2Fcontinue-save">create an account</a>.</> : saveMessage.startsWith("Sign in to save this case") ? <> <a href="/sign-in" target="_blank" rel="noopener noreferrer">Sign in in another tab</a> or <a href="/sign-up" target="_blank" rel="noopener noreferrer">create an account in another tab</a>.</> : null}</p> : null}
    </section></details>
    <CaseResult key={resultRevision} result={result} previousResult={previousResult} additionalDocuments={additionalDocuments} exhibitRemovalPending={exhibitRemovalPending} onRemoveDocument={(id) => { setAdditionalDocuments((previous) => previous.filter((document) => document.id !== id)); setExhibitRemovalPending(true); setNotice("The displayed analysis still includes this exhibit. Recheck to analyze the remaining evidence."); }} isFictionalSample={isFictionalSample} onReset={reset} onRecheck={recheck} rechecking={running} progressEvents={progressEvents} recheckError={error} recheckNotice={notice} onCancelRecheck={() => requestRef.current?.abort()} onLetterChange={setEditedLetter} />
  </div>;

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
            <div className="intake-stepper" aria-label={`Step ${stage} of 3`}><span className={stage >= 1 ? "active" : ""}>01 <b>Case details</b></span><span className={stage >= 2 ? "active" : ""}>02 <b>Documents</b></span><span className={stage >= 3 ? "active" : ""}>03 <b>Review</b></span></div>
            {stage === 1 ? <>
            <p className="eyebrow intake-stage-label">Step 1 · Choose your complaint</p>
            <div className="form-grid intake-choice-grid">
              <label className="full-width" htmlFor="review-intent">What would you like help with?<select id="review-intent" value={form.intent} onChange={event => update('intent',event.target.value as FormState['intent'])}><option value="review-reply">Review a company’s reply</option><option value="first-complaint">Make my first complaint</option></select></label><label htmlFor="company-name">Company name <span className="required-note">Optional</span><input id="company-name" list="company-options" value={form.companyName} maxLength={200} onChange={(event) => update("companyName", event.target.value)} placeholder="Type any company name" /><datalist id="company-options">{COMPANIES.map((company) => <option key={company.slug} value={company.name} />)}</datalist><span className="field-hint">{hasCompanyCoverage ? `Reviewed sources available for this complaint and jurisdiction (checked ${matchedCompany?.reviewedOn}); source coverage does not establish eligibility.` : matchedCompany ? `${matchedCompany.name} has a directory entry, but not for this complaint and jurisdiction. Company-specific research may be limited.` : "Unlisted companies are welcome; company-specific research may be limited."}</span></label>
              <label htmlFor="country">Research jurisdiction<select id="country" value={form.country} onChange={(event) => update("country", event.target.value as Country)}>{COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}</select></label>
              <label htmlFor="case-type" className="full-width">What’s the issue?<select id="case-type" value={form.caseType} onChange={(event) => setForm((previous) => ({ ...previous, caseType: event.target.value, scopeAnswers: {} }))}>{CASE_TYPES.map((pack) => <option key={pack.id} value={pack.id}>{pack.label}</option>)}</select></label>
            </div>
            <fieldset className="scope-answer-fields"><legend>Details that may affect which information is relevant</legend><p className="field-hint">Optional. Leave any answer blank if you do not know it. These are your answers, separate from details found in your documents; they are not legal advice or an eligibility decision.</p><div className="form-grid">{SCOPE_QUESTIONS[form.caseType as keyof typeof SCOPE_QUESTIONS]?.map((question) => {
              const id = `scope-${question.key}`;
              const value = form.scopeAnswers[question.key] ?? "";
              return <label key={question.key} htmlFor={id} className={question.type === "textarea" ? "full-width" : undefined}>{question.label}<span className="required-note">Optional</span>{question.type === "select" ? <select id={id} value={value} onChange={(event) => setForm((previous) => ({ ...previous, scopeAnswers: { ...previous.scopeAnswers, [question.key]: event.target.value } }))}><option value="">Not sure / not provided</option>{question.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : question.type === "textarea" ? <textarea id={id} value={value} maxLength={3000} onChange={(event) => setForm((previous) => ({ ...previous, scopeAnswers: { ...previous.scopeAnswers, [question.key]: event.target.value } }))} /> : <input id={id} type={question.type} value={value} maxLength={200} onChange={(event) => setForm((previous) => ({ ...previous, scopeAnswers: { ...previous.scopeAnswers, [question.key]: event.target.value } }))} />}<span className="field-hint">{question.help}</span></label>;
            })}</div></fieldset>
            <p className="field-hint jurisdiction-hint">The applicable rules may also depend on your route, state, sector, or contract.</p>
            <div className="submission-row"><button className="primary-button" type="button" onClick={continueToDocuments}>Continue to documents <span aria-hidden="true">→</span></button></div>
            </> : null}
            {stage === 2 ? <>
            <p className="eyebrow intake-stage-label">Step 2 · Add the record</p>
            <div className="document-label"><label htmlFor="document-text">Document text <span className="required-note">Required</span></label><button className="text-button" type="button" onClick={() => fileRef.current?.click()}>Upload .txt / .md <span aria-hidden="true">↗</span></button></div>
            <input ref={fileRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="sr-only" tabIndex={-1} aria-label="Upload a text document" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
            <textarea id="document-text" className="document-input" value={form.documentText} onChange={(event) => { update("documentText", event.target.value); setFileName(null); }} aria-describedby="document-hint document-count" placeholder="Paste the bill, notice, or email here. Include dates, charges, and the company’s explanation where available." required />
            <div className="document-meta"><span id="document-hint">{fileName ? `Loaded ${fileName}` : "TXT or Markdown · max 256 KiB · no PDF or image support"}</span><span id="document-count" className={form.documentText.length > MAX_DOCUMENT_CHARACTERS ? "over-limit" : ""}>{form.documentText.length.toLocaleString("en-IN")} / 30,000 characters</span></div>
            <label htmlFor="company-response" className="company-response-label">Company’s reply <span className="required-note">{form.intent === "review-reply" ? "Required" : "Optional"}</span></label>
            <textarea id="company-response" className="company-response-input" value={form.companyResponse} onChange={(event) => update("companyResponse", event.target.value)} aria-describedby="company-response-hint company-response-count" placeholder="If you have received a reply, paste it here. The Rebuttal Lab will investigate its explanation and identify what evidence is missing." required={form.intent === "review-reply"} />
            <div className="company-response-meta"><p className="field-hint" id="company-response-hint">Use the exact reply where possible. An explanation is not proof that the company is right.</p><span id="company-response-count" className={`character-counter ${form.companyResponse.length > 12_000 ? "over-limit" : ""}`}>{form.companyResponse.length.toLocaleString("en-IN")} / 12,000 characters</span></div>
            <div className="sample-row"><span>Just looking around?</span><button className="text-button" type="button" onClick={() => { setForm({ ...DEFAULT_FORM, caseType: "subscription-cancel", documentText: SAMPLE, companyResponse: "Your subscription remained active through the next billing date. Our records show that cancellation was not completed before the renewal. We cannot refund the charge." }); setIsFictionalSample(true); setFileName(null); setError(null); setNotice("Fictional sample loaded. The company reply is invented; research results are retrieved live."); }}>Try a fictional example <span aria-hidden="true">→</span></button></div>
            <details className="preferences"><summary>Personalize your letter <span>Optional</span></summary><div className="form-grid preference-fields"><label htmlFor="user-name">Your name<input id="user-name" autoComplete="name" value={form.userName} maxLength={200} onChange={(event) => update("userName", event.target.value)} placeholder="Or leave a placeholder" /></label><label htmlFor="letter-language">Letter language<input id="letter-language" value="English" readOnly aria-describedby="language-hint" /><span className="field-hint" id="language-hint">English is supported in this version.</span></label><label htmlFor="desired-outcome" className="full-width">What would resolve this?<input id="desired-outcome" value={form.desiredOutcome} maxLength={2000} onChange={(event) => update("desiredOutcome", event.target.value)} placeholder="For example, cancel my plan and review the latest charge" /></label><label htmlFor="reply-deadline" className="full-width">Requested reply period<input id="reply-deadline" value={form.replyDeadline} maxLength={100} onChange={(event) => update("replyDeadline", event.target.value)} aria-describedby="reply-hint" /><span className="field-hint" id="reply-hint">A requested response time, not an established legal deadline.</span></label></div></details>
            <div className="submission-row"><button className="secondary-button" type="button" onClick={() => { setError(null); setStage(1); }}>Back</button><button className="primary-button" type="button" disabled={preparing} onClick={() => void reviewCase()}>{preparing ? "Reading your record…" : "Check my facts"} <span aria-hidden="true">→</span></button></div>
            </> : null}
            {stage === 3 ? <>
              <p className="eyebrow intake-stage-label">Step 3 · Check before analysis</p>
              <section className="fact-confirmation"><h3>Did we understand your record?</h3><p>Check these extracted statements. If something is wrong, go back and clarify the document text before continuing. These statements are not independently verified.</p><dl>{Object.entries(preparedFacts ?? {}).filter(([key]) => !['companyPosition','disputeSummary'].includes(key)).map(([key,value]) => <div key={key}><dt>{key.replace(/([a-z])([A-Z])/g,'$1 $2')}</dt><dd>{Array.isArray(value) ? value.join(' · ') : String(value ?? 'Not stated')}</dd></div>)}</dl><label><input type="checkbox" checked={factsConfirmed} onChange={event => setFactsConfirmed(event.target.checked)} /> I checked these details against my record.</label></section><div className="intake-review"><dl><div><dt>Company</dt><dd>{form.companyName || "Not listed"}</dd></div><div><dt>Research jurisdiction</dt><dd>{COUNTRIES.find((country) => country.code === form.country)?.label}</dd></div><div><dt>Complaint type</dt><dd>{CASE_TYPES.find((pack) => pack.id === form.caseType)?.label}</dd></div><div><dt>Scope answers provided</dt><dd>{Object.values(form.scopeAnswers).filter(Boolean).length} · optional details</dd></div><div><dt>Primary document</dt><dd>{fileName || `${form.documentText.length.toLocaleString("en-IN")} characters pasted`}</dd></div><div><dt>Company response</dt><dd>{form.companyResponse.length.toLocaleString("en-IN")} characters</dd></div><div><dt>Additional exhibits</dt><dd>{additionalDocuments.length}</dd></div></dl></div>
              <p className="privacy-note">Your text is sent to the configured analysis and research providers. Guest cases are not saved. After analysis, you can choose whether to save the full case to a private account.</p>
              <div className="submission-row"><button className="secondary-button" type="button" onClick={() => { setError(null); setStage(2); }}>Back to documents</button><button className="primary-button" type="submit" disabled={running || !factsConfirmed}>{running ? "Analysis in progress" : "Review my case"}<span aria-hidden="true">→</span></button></div>
            </> : null}
          </fieldset>
          {error ? <div className="feedback error-feedback" role="alert">{error}</div> : null}
          {notice ? <p className="feedback notice-feedback" role="status">{notice}</p> : null}
          {running ? <div className="analysis-status" role="status" aria-live="polite"><span className="activity-indicator" aria-hidden="true" /><div><strong>Building your case analysis…</strong><p>Following the real research and evidence checks as they happen.</p><details><summary>View review activity</summary><AnalysisProgress events={progressEvents} /></details></div></div> : null}
          {running ? <div className="submission-row"><button className="secondary-button" type="button" onClick={() => requestRef.current?.abort()}>Cancel analysis</button></div> : stage === 1 ? <button className="text-button clear-button" type="button" onClick={reset}>Clear all details</button> : null}
        </form>
      </section>
    </div>
  );
}
