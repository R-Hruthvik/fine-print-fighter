"use client";

import { useState } from "react";
import { containsExactPassage } from "@/lib/exact-passage";

const MATCHED_PASSAGE = "Your cancellation is confirmed effective 5 October 2026.";
const CONFIRMATION = `${MATCHED_PASSAGE} No further renewals will be charged.`;
const WELCOME_EMAIL = "Welcome to Example Streaming. Your monthly plan is ready to use.";

export function EvidenceWalkthrough() {
  const [evidence, setEvidence] = useState(CONFIRMATION);
  const matched = containsExactPassage(evidence, MATCHED_PASSAGE);

  return (
    <section className="evidence-walkthrough" aria-labelledby="walkthrough-heading">
      <div className="walkthrough-heading">
        <div>
          <p className="eyebrow">Try the evidence check</p>
          <h2 id="walkthrough-heading">Remove the proof.</h2>
        </div>
        <span>20 sec</span>
      </div>
      <p className="walkthrough-disclosure">Fictional walkthrough · offline · no model or research calls</p>
      <div className="walkthrough-company">
        <span className="small-label">Company reply</span>
        <p>“Our records show cancellation was not completed before renewal.”</p>
      </div>
      <div className="walkthrough-policy">
        <span className="small-label">Fictional policy excerpt</span>
        <p>“Cancellation takes effect when confirmed by the company.”</p>
      </div>
      <label htmlFor="walkthrough-evidence">Exhibit text <span>(fictional)</span></label>
      <textarea id="walkthrough-evidence" value={evidence} onChange={(event) => setEvidence(event.target.value)} aria-describedby="walkthrough-result" />
      <p id="walkthrough-result" className={`walkthrough-result ${matched ? "walkthrough-match" : "walkthrough-gap"}`} role="status">
        <strong>{matched ? "Exact passage found" : "Evidence gap remains"}</strong>
        <span>{matched ? "This document matches the cancellation date in the sample. It does not establish refund eligibility." : "The supplied text does not contain the cited cancellation confirmation."}</span>
      </p>
      {matched ? <blockquote className="walkthrough-quote"><mark>{MATCHED_PASSAGE}</mark></blockquote> : null}
      <div className="walkthrough-actions" aria-label="Change the fictional exhibit">
        <button type="button" className="text-button" onClick={() => setEvidence("")}>Remove confirmation</button>
        <button type="button" className="text-button" onClick={() => setEvidence(WELCOME_EMAIL)}>Use unrelated email</button>
        <button type="button" className="text-button" onClick={() => setEvidence(CONFIRMATION)}>Restore confirmation</button>
      </div>
      <p className="walkthrough-letter"><span className="small-label">Response detail</span>{matched ? "I’ve attached a cancellation confirmation dated 5 October. Please review whether it changes your account record." : "I requested cancellation, but the document shown here does not confirm whether it was completed."}</p>
      <p className="walkthrough-note">A passage match shows what the document says. It does not determine what the company must do.</p>
    </section>
  );
}
