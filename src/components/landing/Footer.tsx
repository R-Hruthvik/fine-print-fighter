import Link from "next/link";
import React from "react";
import { COMPANIES, GUIDES } from "@/lib/catalog";
import styles from "./landing.module.css";

const COMPLAINT_LINK = { label: "Complaints", href: "/complaints" };

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles["footer-engrave"]} aria-hidden="true" />

      <div className={styles.wrap}>
        <div className={styles["foot-cta"]}>
          <h2>
            Their letter has weak spots.<br />
            <em>Find them.</em>
          </h2>
          <Link className={`${styles.btn} ${styles["btn-hl"]}`} href="/complaints/new">
            Start a complaint
          </Link>
          <p className={styles.micro}>
            <span>Your words. Your decision. You send.</span>
            <i>&sect;</i>
            <span>Not legal advice</span>
          </p>
          <p className={styles["foot-privacy"]}>
            Real analysis text is sent to the configured model provider;
            minimized research queries may go to the search provider. Nothing
            is filed for you.
          </p>
        </div>

        <div className={styles["foot-grid"]}>
          <div>
            <p className={styles["foot-tag"]}>
              A consumer-dispute toolkit for reading company replies and
              preparing answers you control.
            </p>
          </div>
          <div>
            <p className={styles.disclaimer}>
              <b>&sect;</b> Not legal advice. Fine Print Fighter helps you
              organize evidence and draft replies; you review and send. Nothing
              is filed for you.
            </p>
          </div>
        </div>

        <div className={styles["foot-base"]}>
          <span>Fine Print Fighter</span>
          <nav className={styles["foot-links"]} aria-label="Catalog">
            <Link href={COMPLAINT_LINK.href}>{COMPLAINT_LINK.label}</Link>
            <Link href="/companies">Companies</Link>
            <Link href="/guides">Guides</Link>
            <Link href="/cases">My cases</Link>
            <Link href="/profile">Account &amp; privacy</Link>
            {COMPANIES.map((company) => (
              <React.Fragment key={company.slug}>
                <span aria-hidden="true">&nbsp;&sect;&nbsp;</span>
                <Link href={`/companies/${company.slug}`}>{company.name}</Link>
              </React.Fragment>
            ))}
            {GUIDES.map((guide) => (
              <React.Fragment key={guide.slug}>
                <span aria-hidden="true">&nbsp;&sect;&nbsp;</span>
                <Link href={`/guides/${guide.slug}`}>{guide.title}</Link>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
