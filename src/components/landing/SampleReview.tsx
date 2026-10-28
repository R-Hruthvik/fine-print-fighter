"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  INITIAL_REPLY,
  QUESTIONS,
  appendQuestion,
  countWords,
} from "./sample";
import styles from "./sample-review.module.css";

export default function SampleReview(): React.JSX.Element {
  const [draft, setDraft] = useState(INITIAL_REPLY);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [status, setStatus] = useState("Your words. Your decision. You send.");
  const [openQuestions, setOpenQuestions] = useState<string[]>([QUESTIONS[0].id]);
  const editor = useRef<HTMLTextAreaElement>(null);

  function handleAdd(questionId: string) {
    const question = QUESTIONS.find((q) => q.id === questionId);
    if (!question || addedIds.includes(questionId)) {
      return;
    }
    const next = appendQuestion(draft, addedIds, questionId);
    setDraft(next.draft);
    setAddedIds([...next.addedIds]);
    setStatus(`Added: ${question.title}`);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(draft);
      setStatus("Draft copied. Review and personalize it before sending.");
    } catch {
      editor.current?.focus();
      editor.current?.select();
      setStatus(
        "Copy is unavailable. The draft is selected so you can copy it manually.",
      );
    }
  }

  function handleReset() {
    setDraft(INITIAL_REPLY);
    setAddedIds([]);
    setStatus("Sample reply reset.");
  }

  const isAdded = (id: string) => addedIds.includes(id);

  return (
    <section id="sample-review" aria-labelledby="sample-heading" className={styles.section}>
      <div className={styles.wrap}>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Try the next move</p>
            <h2 id="sample-heading" className={styles.title}>
              An open question.<br />
              <em>A clearer reply.</em>
            </h2>
          </div>
        </header>

        <div className={styles.grid}>
          <div className={styles.questions}>
            <p className={styles.label}>01 / What still needs an answer</p>
            {QUESTIONS.map((question) => (
              <details
                key={question.id}
                className={styles.detail}
                open={openQuestions.includes(question.id)}
                onToggle={(event) => {
                  const open = event.currentTarget.open;
                  setOpenQuestions((current) => open
                    ? current.includes(question.id) ? current : [...current, question.id]
                    : current.filter((id) => id !== question.id));
                }}
              >
                <summary className={styles.summary}>
                  <span>{question.title}</span>
                  <span className={styles.expand} aria-hidden="true">
                    +
                  </span>
                </summary>
                <div className={styles.body}>
                  <p>{question.note}</p>
                  <button
                    type="button"
                    className={`${styles.addButton} ${isAdded(question.id) ? styles.added : ""}`}
                    disabled={isAdded(question.id)}
                    onClick={() => handleAdd(question.id)}
                  >
                    {isAdded(question.id) ? "Added to your reply" : "Add to my reply"}
                  </button>
                </div>
              </details>
            ))}
            <p className={styles.aside}>
              The useful part isn&rsquo;t sounding tougher.<br />
              It&rsquo;s being specific about what&rsquo;s missing.
            </p>
          </div>

          <div className={styles.reply}>
            <span className={styles.tape} aria-hidden="true" />
            <div className={styles.replyHeading}>
              <label htmlFor="sample-reply" className={styles.replyLabel}>
                02 / Your editable reply
              </label>
              <span className={styles.fictionalLabel}>Fictional sample</span>
            </div>
            <textarea
              id="sample-reply"
              ref={editor}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setStatus("");
              }}
              spellCheck
              aria-describedby="sample-status"
              className={styles.textarea}
            />
            <div className={styles.actions}>
              <span className={styles.wordCount}>
                {countWords(draft)} words
              </span>
              <button type="button" className={styles.copyButton} onClick={handleCopy}>
                Copy reply <span aria-hidden="true">&rarr;</span>
              </button>
              <button type="button" className={styles.resetButton} onClick={handleReset}>
                Reset sample
              </button>
            </div>
            <p id="sample-status" className={styles.status} role="status" aria-live="polite">
              {status}
            </p>
            <p className={styles.localOnly}>
              This is a fictional sample used for demonstration only. It lives on your
              device; nothing here is sent, saved, or filed.
            </p>
            <Link className={styles.newCaseLink} href="/complaints/new">
              Try it with your own documents <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
