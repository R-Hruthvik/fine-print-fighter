import { FighterApp } from "@/components/FighterApp";
import { SiteShell } from "@/components/SiteShell";
import Link from "next/link";
import { Suspense } from "react";

export default function NewComplaintPage({ searchParams }: { searchParams: Promise<{ pack?: string }> }) {
  return <SiteShell><div className="app-container intake-page"><nav className="intake-breadcrumb" aria-label="Breadcrumb"><Link href="/complaints">Complaints</Link><span aria-hidden="true">/</span><span>Start a complaint</span></nav><Suspense fallback={<p className="feedback notice-feedback">Loading complaint intake…</p>}><ComplaintIntake searchParams={searchParams} /></Suspense></div></SiteShell>;
}

async function ComplaintIntake({ searchParams }: { searchParams: Promise<{ pack?: string }> }) {
  const { pack } = await searchParams;
  return <FighterApp initialPackId={pack} />;
}
