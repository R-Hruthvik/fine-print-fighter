import Link from "next/link";
import type { ReactNode } from "react";

export function SiteShell({ children }: { children: ReactNode }) {
  return <div className="site-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Fine Print Fighter home"><span className="brand-mark" aria-hidden="true">§</span><span>Fine Print <em>Fighter</em></span></Link>
      <nav className="primary-nav" aria-label="Main navigation">
        <Link href="/complaints">Complaints</Link><Link href="/companies">Companies</Link><Link href="/guides">Guides</Link><Link href="/cases">My cases</Link>
      </nav>
      <div className="header-actions"><Link className="account-link" href="/sign-in">Sign in</Link><Link className="header-cta" href="/complaints/new">Start a complaint <span aria-hidden="true">↗</span></Link></div>
    </header>
    <main id="main-content">{children}</main>
    <footer className="site-footer">
      <Link href="/" className="footer-brand">Fine Print Fighter</Link>
      <p>Information, not legal advice. You review. You decide. You send.</p>
      <nav aria-label="Footer navigation"><Link href="/complaints">Complaints</Link><Link href="/companies">Companies</Link><Link href="/guides">Guides</Link><Link href="/profile">Privacy &amp; account</Link></nav>
    </footer>
  </div>;
}

export function PageIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <header className="page-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{body}</p></header>;
}

export function SectionTitle({ index, title, children }: { index?: string; title: string; children?: ReactNode }) {
  return <div className="section-title-block">{index ? <span className="section-number">{index}</span> : null}<h2>{title}</h2>{children}</div>;
}
