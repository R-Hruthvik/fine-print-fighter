"use client";

import React, { useState } from "react";
import styles from "./landing.module.css";

// Fictional illustrative examples — open questions a company reply might leave,
// not claims that any policy never applies.
const ITEMS = [
  { q: "“Per our records…”", v: "Which record?" },
  { q: "“We hope this resolves the matter.”", v: "Question unanswered" },
  { q: "“Our policy states…”", v: "Ask for the wording" },
  { q: "“Contact us for more information.”", v: "Ask for a clear answer" },
];

function MarqueeGroup() {
  return (
    <div className={styles["marquee-group"]}>
      {ITEMS.map((item, index) => (
        <React.Fragment key={index}>
          <span className={styles["tk-q"]}>{item.q}</span>
          <span className={styles["tk-v"]}>{item.v}</span>
          <span className={styles["tk-sep"]} aria-hidden="true">
            &sect;
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Ticker() {
  const [paused, setPaused] = useState(false);
  const playState = paused ? "paused" : "running";

  return (
    <section
      className={styles.ticker}
      aria-label="Fictional examples of corporate phrasing and the open questions they raise"
      style={{ position: "relative" }}
    >
      <button
        type="button"
        className={styles.tickerToggle}
        aria-pressed={paused}
        aria-label={paused ? "Resume ticker" : "Pause ticker"}
        onClick={() => setPaused((current) => !current)}
      >
        {paused ? "Play ↗" : "Pause Ⅱ"}
      </button>
      <div className={styles.tickerWindow}>
      <div
        className={styles["marquee-track"]}
        style={{ animationPlayState: playState }}
      >
        <MarqueeGroup />
        <div aria-hidden="true">
          <MarqueeGroup />
        </div>
      </div>
      </div>
    </section>
  );
}
