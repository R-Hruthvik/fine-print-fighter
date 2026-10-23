import Link from "next/link";
import { FighterApp } from "@/components/FighterApp";

export default function Home() {
  return (
    <main className="site-shell">
      <header className="site-header"><Link className="brand" href="/" aria-label="Fine Print Fighter home"><span className="brand-mark" aria-hidden="true">fp.</span><span>Fine Print<br />Fighter</span></Link><div className="header-right"><span className="header-caption">Facts first. Your voice next.</span><a href="#how-it-works" className="header-link">How it works <span aria-hidden="true">↗</span></a></div></header>
      <div className="app-container"><FighterApp /></div>
      <footer className="site-footer"><span>Fine Print Fighter</span><p>Information, not legal advice. You review. You decide. You send.</p><span className="footer-provider">Powered by Nemotron + Nebius</span></footer>
    </main>
  );
}
