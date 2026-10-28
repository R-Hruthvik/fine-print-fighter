import Image from "next/image";
import Link from "next/link";
import DocumentScene from "./DocumentScene";
import styles from "./landing.module.css";

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Hero() {
  return (
    <section id="start" className={styles.hero}>
      <div className={styles["hero-bg"]} aria-hidden="true">
        <Image
          className={styles.engraving}
          src="/images/fine-print-engraving.jpg"
          alt=""
          width={1024}
          height={1024}
        />
        <span className={styles.watermark}>&sect;</span>
      </div>

      <div className={`${styles.wrap} ${styles["hero-grid"]}`}>
        <div className={styles["hero-copy"]}>
          <p className={styles.eyebrow}>A consumer-dispute toolkit</p>

          <h1 className={`${styles["hero-h1"]} ${styles.rise}`} style={{ animationDelay: "0.08s" }}>
            <span className={styles.headlineLead}>Read between</span>
            <br />
            <span className={styles.circled}>
              their
              <svg
                className={styles["circle-svg"]}
                viewBox="0 0 100 44"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <ellipse
                  cx="50"
                  cy="22"
                  rx="46"
                  ry="18"
                  pathLength="100"
                />
              </svg>
            </span>{" "}
            <span className={styles["mk-y"]} style={{ animationDelay: "1.2s" }}>
              lines.
            </span>
          </h1>

          <p className={`${styles["hero-sub"]} ${styles.rise}`} style={{ animationDelay: "0.16s" }}>
            Paste the company&rsquo;s written response to your dispute. Fine
            Print Fighter organizes your evidence, helps you spot questions they{" "}
            <span className={styles["mk-y"]} style={{ animationDelay: "1.4s" }}>
              left unanswered
            </span>
            , and helps you prepare a reply you can edit and send — in plain
            language, with receipts.
          </p>

          <div className={`${styles["hero-cta"]} ${styles.rise}`} style={{ animationDelay: "0.24s" }}>
            <Link href="/complaints/new" className={`${styles.btn} ${styles["btn-primary"]}`}>
              Review their response
              <ArrowIcon />
            </Link>
            <a className={`${styles.btn} ${styles["btn-ghost"]}`} href="#how-it-works">
              <span>See how it works</span>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 5v14M6 13l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>

          <p className={`${styles.micro} ${styles.rise}`} style={{ animationDelay: "0.32s" }}>
            <span>Free to analyze</span>
            <i aria-hidden="true">&sect;</i>
            <span>You review and send</span>
            <i>&sect;</i>
            <span>Not legal advice</span>
          </p>
        </div>

        <div className={styles.rise} style={{ animationDelay: "0.42s" }}>
          <DocumentScene />
        </div>
      </div>
    </section>
  );
}
