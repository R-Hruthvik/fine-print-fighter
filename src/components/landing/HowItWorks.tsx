import styles from "./landing.module.css";

function DocIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 3h9l4 4v14H6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 3v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.5 12h6M9.5 15.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LensIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.2 15.2 21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 10.5h5M10.5 8v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14.5 6.5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const STEPS = [
  {
    num: "01",
    icon: <DocIcon />,
    title: "Paste their reply",
    body:
      "Paste the company's written response, or drop in a .txt or .md export. Start with the record you already have.",
    meta: "Input — pasted text or .txt/.md",
  },
  {
    num: "02",
    icon: <LensIcon />,
    title: "Cross-reference the claims",
    body:
      "Review what the evidence supports, what remains uncertain, and which questions still need an answer.",
    meta: "Output — evidence and open questions",
  },
  {
    num: "03",
    icon: <PenIcon />,
    title: "You review and send",
    body:
      "Edit the draft until it sounds like you, then send it yourself. Nothing is filed or sent for you.",
    meta: "You review · you send",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className={`${styles.how} ${styles.wrap}`}>
      <p className={styles.eyebrow}>The method</p>
      <h2>
        From their reply,
        <br />
        to your <em>rebuttal.</em>
      </h2>
      <div className={styles.steps}>
        {STEPS.map((step, index) => (
          <article
            key={step.num}
            className={styles.step}
            style={{ animationDelay: `${0.16 + index * 0.1}s` }}
          >
            <span className={styles["step-num"]} aria-hidden="true">
              {step.num}
            </span>
            <span className={styles["step-icon"]}>{step.icon}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            <span className={styles["step-meta"]}>{step.meta}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
