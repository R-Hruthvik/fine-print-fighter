"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisProgressEvent, Country, PipelineResult } from "@/lib/types";
import type { SaveCaseInput } from "@/lib/saved-cases";
import { clearPendingCaseSave, storePendingCaseSave } from "@/lib/pending-case-save";
import { CASE_TYPES, COUNTRIES } from "@/lib/packs";
import { MAX_FILE_BYTES, validateDocument, validateTextFile } from "./workflow";
import { CaseResult } from "./CaseResult";
import { AnalysisProgress } from "./AnalysisProgress";

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
  const [saveRequested, setSaveRequested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [pendingSaveReady, setPendingSaveReady] = useState(false);
  const [attachments, setAttachments] = useState<{ id: string; label: string; text: string; role: "record" | "company-reply" | "previous-company-reply" }[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCaseType, setSelectedCaseType] = useState(initialPackId && CASE_TYPES.some(pack => pack.id === initialPackId) ? initialPackId : "");
  const [showQuestions, setShowQuestions] = useState(false);
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

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    setNotice(null);
    const incoming = Array.from(files);
    if (attachments.length + incoming.length > 4) { setError("You can add up to four documents. Remove one before adding another."); return; }
    const loaded: typeof attachments = [];
    for (const file of incoming) {
      if (file.size > MAX_FILE_BYTES) { setError(`${file.name} exceeds 256 KiB. Choose a smaller text file.`); return; }
      try {
        const text = await file.text();
        const validation = validateTextFile(file.name, file.type, file.size, text);
        if (validation) { setError(`${file.name}: ${validation}`); return; }
        if (text.length > 12_000) { setError(`${file.name}: each added document must be 12,000 characters or fewer.`); return; }
        loaded.push({ id: crypto.randomUUID(), label: file.name, text, role: "record" });
      } catch { setError(`Could not read ${file.name}. Try another text file or paste its text.`); return; }
    }
    setAttachments(previous => [...previous, ...loaded]);
    setNotice(`${loaded.length} ${loaded.length === 1 ? "document added" : "documents added"}. Choose “Company reply” for any reply from the company.`);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.documentText.trim() && !attachments.some(item => item.role === "record")) { setError("Describe what happened or add a document about your case."); return; }
    if (!selectedCountry || !selectedCaseType) { setShowQuestions(true); setError("Choose where this happened and the issue type so we can search relevant sources."); return; }
    await submitAnalysis([]);
  }

  async function recheck(documents: { id: string; label: string; text: string; role?: "record" | "company-reply" }[]) {
    const merged = [...additionalDocuments];
    let nextAttachments = [...attachments];
    let nextCompanyResponse = form.companyResponse;
    for (const document of documents) {
      if (document.role === "company-reply") {
        nextAttachments = nextAttachments.map(item => item.role === "company-reply" ? {...item, role: "previous-company-reply"} : item);
        if (nextCompanyResponse.trim()) {
          nextAttachments.push({id: `p-${crypto.randomUUID()}`, label: "Previous company reply", text: nextCompanyResponse, role: "previous-company-reply"});
          nextCompanyResponse = "";
        }
        nextAttachments.push({...document, role: "company-reply"});
      } else {
        const index = merged.findIndex(existing => existing.id === document.id);
        if (index < 0) merged.push(document);
        else merged[index] = document;
      }
    }
    if (nextAttachments.length > 4) { setError("You can review up to four workspace documents. Start a new case or remove a document before adding this reply."); return; }
    await submitAnalysis(merged, nextAttachments, nextCompanyResponse);
  }

  async function submitAnalysis(documents: { id: string; label: string; text: string }[], requestAttachments = attachments, requestCompanyResponse = form.companyResponse) {
    if (requestRef.current) return;
    if (!form.documentText.trim() && !requestAttachments.some(item => item.role === "record")) { setError("Describe what happened or add a document about your case."); return; }
    if (form.documentText && validateDocument(form.documentText)) { setError(validateDocument(form.documentText)); return; }
    const supportingCount = requestAttachments.filter(item => item.role !== "company-reply").length - (form.documentText.trim() ? 0 : 1) + documents.length;
    if (supportingCount > 3) { setError("You can add up to three supporting documents in addition to your account and the current company reply."); return; }
    if (requestAttachments.filter(item => item.role === "company-reply").length + (requestCompanyResponse.trim() ? 1 : 0) > 1) { setError("Add only one company reply to this review. Combine replies into one text or use a follow-up after the review."); return; }
    if (requestCompanyResponse.length > 12_000) { setError("The company reply exceeds 12,000 characters. Shorten it before reviewing."); return; }
    if (form.documentText.length + requestCompanyResponse.length + requestAttachments.reduce((total, document) => total + document.text.length, 0) + documents.reduce((total, document) => total + document.text.length, 0) > 30_000) {
      setError("All case documents together exceed 30,000 characters. Shorten one before analyzing."); return;
    }
    if (!CASE_TYPES.some(pack => pack.id === selectedCaseType) || !COUNTRIES.some(country => country.code === selectedCountry)) {
      setShowQuestions(true); setError("Choose where this happened and the issue type so we can search relevant sources."); return;
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
        body: JSON.stringify({ ...form, intent: "first-complaint", country: selectedCountry, companyResponse: requestCompanyResponse, workspaceDocuments: requestAttachments, additionalDocuments: documents, packId: selectedCaseType, scopeAnswers: form.scopeAnswers, userName: form.userName || undefined, desiredOutcome: form.desiredOutcome || undefined }),
      });
      const data = await readPipelineResponse(response, (event) => setProgressEvents((previous) => [...previous, event])) as Partial<PipelineResult> | null;
      if (!data?.score || !Array.isArray(data.findings) || !Array.isArray(data.sources) || typeof data.letter !== "string") {
        throw new Error("The analysis response was incomplete. Your text is still here; please try again.");
      }
      if (!controller.signal.aborted) {
        if (result) setPreviousResult(result);
        setAdditionalDocuments(documents);
        setAttachments(requestAttachments);
        if (requestCompanyResponse !== form.companyResponse) update("companyResponse", requestCompanyResponse);
        setExhibitRemovalPending(false);
        setProgressEvents([]);
        setResult(data as PipelineResult);
        setEditedLetter(result && editedLetter !== result.letter ? editedLetter : data.letter);
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
    setAdditionalDocuments([]);
    setExhibitRemovalPending(false);
    setSaveRequested(false);
    setSaveMessage(null);
    clearPendingCaseSave();
    setPendingSaveReady(false);
    setAttachments([]);
    setSelectedCountry("");
    setSelectedCaseType(initialPackId && CASE_TYPES.some(pack => pack.id === initialPackId) ? initialPackId : "");
    setShowQuestions(false);
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
      const primaryAttachment = !form.documentText.trim() ? attachments.find(item => item.role === "record") : undefined;
      const currentReply = form.companyResponse || attachments.find(item => item.role === "company-reply")?.text || "";
      if (!currentReply.trim()) { setSaveMessage("Saving currently requires a company reply. Keep this page open until you have one."); return; }
      const documents = [
        { label: "Primary document", text: form.documentText.trim() || primaryAttachment?.text || "" },
        { label: "Company response", text: currentReply },
        ...attachments.filter(item => item.id !== primaryAttachment?.id && item.role !== "company-reply").map(item => ({ label: item.label, text: item.text })),
        ...additionalDocuments.map((item) => ({ label: item.label, text: item.text })),
      ];
      const letter = editedLetter;
      const input: SaveCaseInput = {
        companyName: form.companyName || "Unlisted company",
        packId: selectedCaseType,
        jurisdiction: selectedCountry as Country,
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
    <CaseResult key={resultRevision} initialLetter={editedLetter} result={result} previousResult={previousResult} additionalDocuments={additionalDocuments} exhibitRemovalPending={exhibitRemovalPending} onRemoveDocument={(id) => { setAdditionalDocuments((previous) => previous.filter((document) => document.id !== id)); setExhibitRemovalPending(true); setNotice("The displayed analysis still includes this exhibit. Recheck to analyze the remaining evidence."); }} isFictionalSample={isFictionalSample} onReset={reset} onRecheck={recheck} rechecking={running} progressEvents={progressEvents} recheckError={error} recheckNotice={notice} onCancelRecheck={() => requestRef.current?.abort()} onLetterChange={setEditedLetter} />
  </div>;

  return (
    <section className="case-workspace screen-only" aria-labelledby="workspace-title">
      <div className="workspace-topline"><span>YOUR CASE WORKSPACE</span><span>Guest cases are not saved</span></div>
      <div className="workspace-layout">
        <section className="workspace-main">
          <h1 id="workspace-title">Let’s make sense of it.</h1>
          <p className="workspace-intro">A company’s reply, an unexpected charge, or a cancellation that didn’t go to plan. Start wherever you are.</p>
          <form onSubmit={analyze} aria-busy={running}>
            <label className="workspace-label" htmlFor="case-story">Tell us what happened, or paste a message</label>
            <div className="workspace-composer" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!running && event.dataTransfer.files.length) void uploadFiles(event.dataTransfer.files); }}>
              <textarea id="case-story" value={form.documentText} onChange={event => update("documentText", event.target.value)} disabled={running} placeholder="For example: I cancelled my subscription, but I was charged again. The company says…" aria-describedby="workspace-help" />
              <div className="workspace-composer-actions">
                <input ref={fileRef} type="file" multiple accept=".txt,.md,text/plain,text/markdown" className="sr-only" aria-label="Add text documents" onChange={event => { if (event.target.files) void uploadFiles(event.target.files); }} />
                <button type="button" className="workspace-attach" disabled={running} onClick={() => fileRef.current?.click()}><span aria-hidden="true">＋</span> Add files</button>
                <span id="workspace-help">TXT or Markdown · PDFs and images: paste or type their text</span>
              </div>
            </div>
            <details className="workspace-reply"><summary>Paste the company’s reply</summary><label htmlFor="company-reply-paste">Company’s reply</label><textarea id="company-reply-paste" value={form.companyResponse} onChange={event => update("companyResponse", event.target.value)} disabled={running} placeholder="Paste their exact reply here, if you have one." /><p>Their explanation is kept separate from your account. You can also mark an attached file as a company reply.</p></details>
            {attachments.length ? <section className="workspace-attachments" aria-label="Added documents"><h2>Your documents</h2><ul>{attachments.map(item => <li key={item.id}><div><strong>{item.label}</strong><span>{item.text.length.toLocaleString()} characters</span></div><label><span className="sr-only">Role for {item.label}</span><select disabled={running} value={item.role} onChange={event => setAttachments(previous => previous.map(doc => doc.id === item.id ? {...doc, role: event.target.value as "record" | "company-reply"} : doc))}><option value="record">My record</option><option value="company-reply">Company reply</option></select></label><button type="button" disabled={running} aria-label={`Remove ${item.label}`} onClick={() => setAttachments(previous => previous.filter(doc => doc.id !== item.id))}>Remove</button></li>)}</ul></section> : null}
            {showQuestions ? <section className="workspace-questions" aria-labelledby="workspace-questions-heading"><h2 id="workspace-questions-heading">A little context for the review</h2><p>These details help us find relevant information. Choose the closest match.</p><div><label>Where did this happen?<select required value={selectedCountry} onChange={event => setSelectedCountry(event.target.value)}><option value="">Choose a location</option>{COUNTRIES.map(country => <option key={country.code} value={country.code}>{country.label}</option>)}</select></label><label>What kind of issue is it?<select required value={selectedCaseType} onChange={event => setSelectedCaseType(event.target.value)}><option value="">Choose an issue</option>{CASE_TYPES.map(pack => <option key={pack.id} value={pack.id}>{pack.label}</option>)}</select></label></div></section> : null}
            {error ? <p className="workspace-feedback workspace-error" role="alert">{error}</p> : null}
            {notice ? <p className="workspace-feedback" role="status">{notice}</p> : null}
            {!running && progressEvents.some(event => event.type === "document-audit") ? <section className="workspace-progress" aria-label="Incomplete document review"><h2>Partial document review</h2><p>The review stopped before it finished. Your inputs and the early document review are still here; retry when ready.</p><AnalysisProgress events={progressEvents} stopped /></section> : null}
            {running ? <section className="workspace-progress" aria-live="polite"><h2>Review in progress</h2><p>We’re working through your record. Your text stays here if you stop.</p><AnalysisProgress events={progressEvents} /><button className="secondary-button" type="button" onClick={() => requestRef.current?.abort()}>Cancel review</button></section> : <div className="workspace-submit"><button className="primary-button" type="submit">Review my case <span aria-hidden="true">→</span></button><button className="workspace-example" type="button" onClick={() => { setForm({...DEFAULT_FORM, intent: "first-complaint", documentText: SAMPLE}); setSelectedCountry("IN"); setSelectedCaseType("subscription-cancel"); setAttachments([{id: crypto.randomUUID(),label:"Fictional company reply.txt",text:"Your subscription remained active through the next billing date. Our records show that cancellation was not completed before the renewal. We cannot refund the charge.",role:"company-reply"}]); setIsFictionalSample(true); setNotice("Fictional example loaded. Research results are retrieved live."); setError(null); }}>Try a fictional example</button></div>}
            <p className="workspace-privacy">Your text is sent to the configured analysis and research providers. Guest cases are not saved. Nothing is sent to the company.</p>
          </form>
        </section>
        <aside className="workspace-guide" aria-label="What to expect"><h2>What we’ll look for</h2><div><span>01</span><p><strong>What your records say</strong>Dates, charges, and the company’s explanation.</p></div><div><span>02</span><p><strong>What needs a closer look</strong>Missing details, differences, and relevant public sources.</p></div><div><span>03</span><p><strong>What you can do next</strong>A clear next step and a reply you can edit.</p></div><p className="workspace-guide-note">You stay in control. This is an information tool, not legal advice.</p></aside>
      </div>
    </section>
  );
}
