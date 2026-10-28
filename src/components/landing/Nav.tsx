"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "The example", href: "#sample-review" },
  { label: "Guides", href: "/guides" },
  { label: "My cases", href: "/cases" },
  { label: "Sign in", href: "/sign-in" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    },
    [close]
  );

  const cta = (
    <Link
      href="/complaints/new"
      onClick={close}
      className={`${styles.btn} ${styles["btn-primary"]}`}
    >
      Start a review
    </Link>
  );

  return (
    <header
      className={`${styles.nav}${scrolled || open ? ` ${styles["nav-on"]}` : ""}`}
      onKeyDown={handleKeyDown}
    >
      <a className={styles.skip} href="#main-content">
        Skip to content
      </a>
      <div className={`${styles.wrap} ${styles["nav-inner"]}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles["brand-mark"]}>&sect;</span>
          Fine&nbsp;Print <em>Fighter</em>
        </Link>

        <button
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          ref={toggleRef}
          className={styles.menuToggle}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>

        <nav className={styles["nav-links"]} aria-label="Primary">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href}>{item.label}</Link>
          ))}
        </nav>

        <Link
          href="/complaints/new"
          className={`${styles["nav-cta"]} ${styles.btn} ${styles["btn-primary"]}`}
        >
          Start a review
        </Link>
      </div>

      <ul
        id="mobile-menu"
        className={styles.mobileMenu}
        hidden={!open}
        onKeyDown={handleKeyDown}
      >
        {NAV_LINKS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} onClick={close}>
              {item.label}
            </Link>
          </li>
        ))}
        <li>{cta}</li>
      </ul>
    </header>
  );
}
