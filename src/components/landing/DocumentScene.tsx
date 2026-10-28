"use client";

import { useEffect, useRef } from "react";
import styles from "./landing.module.css";

const LENS = 176;
const ZOOM = 2.6;

function DocBody() {
  return (
    <div className={styles['doc-body']}>
      <header className={styles['doc-head']}>
        <span>Meridian Cable Co.</span>
        <span>Ref. &#8470; 004182</span>
        <span>Fictional sample</span>
      </header>
      <p className={styles['doc-date']}>March 28, 2025</p>
      <p>Dear Valued Customer,</p>
      <p>
        Thank you for your correspondence regarding your recent complaint. At Meridian, customer
        satisfaction is our highest priority, and we take all concerns seriously.
      </p>
      <p>
        We have reviewed our files, and{" "}
        <mark className={`${styles['mk']} ${styles['mk-y']}`} style={{ animationDelay: "0.9s" }}>
          per our records
        </mark>
        <sup className={styles['fn']}>1</sup> your account remains active as of the date of your
        request. Please note that{" "}
        <mark className={`${styles['mk']} ${styles['mk-y']}`} style={{ animationDelay: "1.05s" }}>
          cancellation requests must be submitted in writing
        </mark>
        <sup className={styles['fn']}>2</sup> to our Cancellations Department, which handles such
        matters during regular business hours.
      </p>
      <p>
        <span className={`${styles['mk']} ${styles['mk-squig']}`}>
          We hope this letter resolves your concern to your satisfaction.
        </span>
        <sup className={styles['fn']}>3</sup> Should you have further questions,{" "}
        <span className={`${styles['mk']} ${styles['mk-squig']}`}>
          do not hesitate to contact us
        </span>
        <sup className={styles['fn']}>4</sup> through any of the channels listed below.
      </p>
      <p className={styles['doc-sign']}>
        Sincerely,
        <br />
        Meridian Customer Care
        <br />
        <span className={styles['doc-enc']}>Enc. — Terms of Service (rev. 11/2023)</span>
      </p>
      <div className={styles['fine-print']}>
        Notice: Cancellation is effective only upon written confirmation issued by the
        Cancellations Department and may take 30–45 business days to process. During the notice
        period, monthly service charges continue to accrue at the standard rate. A final bill —
        including prorated amounts, equipment non-return fees, and applicable taxes — will be
        issued after the effective date. Late payments are subject to a 1.5% monthly finance
        charge. By using the Service at any time during the notice period, you accept the revised
        Terms of Service, a current copy of which is available upon written request sent by postal
        mail.
      </div>
    </div>
  );
}

export default function DocumentScene() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const lensRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const lens = lensRef.current;
    const zoom = zoomRef.current;
    if (!wrap || !lens || !zoom) return;

    let disposed = false;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hide = () => lens.classList.remove(styles["lens-on"]);
    const syncWidth = () => {
      if (!disposed) zoom.style.width = `${wrap.clientWidth}px`;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !finePointer.matches || reducedMotion.matches) {
        hide();
        return;
      }
      const rect = wrap.getBoundingClientRect();
      const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
      const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
      lens.style.transform = `translate3d(${x - LENS / 2}px, ${y - LENS / 2}px, 0)`;
      zoom.style.transform = `translate3d(${LENS / 2 - ZOOM * x}px, ${LENS / 2 - ZOOM * y}px, 0) scale(${ZOOM})`;
      lens.classList.add(styles["lens-on"]);
    };
    syncWidth();
    const observer = new ResizeObserver(() => { syncWidth(); hide(); });
    observer.observe(wrap);
    document.fonts.ready.then(syncWidth);
    finePointer.addEventListener("change", hide);
    reducedMotion.addEventListener("change", hide);
    wrap.addEventListener("pointerenter", move);
    wrap.addEventListener("pointermove", move);
    wrap.addEventListener("pointerleave", hide);
    return () => {
      disposed = true;
      observer.disconnect();
      finePointer.removeEventListener("change", hide);
      reducedMotion.removeEventListener("change", hide);
      wrap.removeEventListener("pointerenter", move);
      wrap.removeEventListener("pointermove", move);
      wrap.removeEventListener("pointerleave", hide);
    };
  }, []);

  return (
    <div className={styles['scene']}>
      <p className={styles['lens-hint']} aria-hidden="true">
        Run the lens over the fine print
        <svg width="34" height="24" viewBox="0 0 40 26" fill="none" aria-hidden="true">
          <path
            d="M2 2 C 14 4, 26 9, 33 21"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M27.5 19.5 L33.5 22.5 L35.5 15.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </p>

      <div className={styles['scene-cards']}>
        <div className={`${styles['hud']} ${styles['hud-a']}`}>
          <span className={styles['hud-label']}>Sample observations</span>
          <strong className={styles['hud-value']}>4 review notes</strong>
          <span className={styles['hud-cap']}>Review alongside your records</span>
        </div>
        <div className={`${styles['hud']} ${styles['hud-b']}`}>
          <span className={styles['hud-stamp']}>Review needed</span>
        </div>
      </div>

      <div ref={wrapRef} className={styles['paper-wrap']}>
        <span className={styles['sheet-under']} aria-hidden="true" />
        <span className={styles['tape']} aria-hidden="true" />
        <article className={styles['doc-sheet']}>
          <DocBody />
        </article>
        <div ref={lensRef} className={styles['lens']} aria-hidden="true">
          <div className={styles['lens-glass']}>
            <div ref={zoomRef} className={styles['lens-zoom']}>
              <article className={styles['doc-sheet']}><DocBody /></article>
            </div>
          </div>
          <span className={styles['lens-handle']} />
        </div>
      </div>

      <p className={styles['lens-hint-touch']} aria-hidden="true">
        Read the sample observations below
      </p>

      <div className={styles['notes']}>
        <p className={styles['notes-head']}>
          In the margin — <em>their letter vs. your evidence</em>
        </p>
        <ol className={styles['notes-grid']}>
          <li className={styles['note']}>
            <b>1</b>
            <p>
              &ldquo;per our records&rdquo; — no record cited. Your cancellation email of{" "}
              <mark>Mar 4</mark> is not addressed.
            </p>
          </li>
          <li className={styles['note']}>
            <b>2</b>
            <p>
              &ldquo;submitted in writing&rdquo; — it was. Twice: <mark>Mar 4</mark> email,{" "}
              <mark>Mar 12</mark> portal. Both in the sample record.
            </p>
          </li>
          <li className={styles['note']}>
            <b>3</b>
            <p>
              &ldquo;resolves your concern&rdquo; — your actual question,{" "}
              <mark>a refund of the March charge</mark>, is never answered.
            </p>
          </li>
          <li className={styles['note']}>
            <b>4</b>
            <p>
              &ldquo;do not hesitate&rdquo; — the same support channel, with <mark>no answer to the refund question</mark>.
            </p>
          </li>
        </ol>
      </div>
    </div>
  );
}
