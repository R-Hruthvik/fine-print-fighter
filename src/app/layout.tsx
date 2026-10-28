import type { Metadata } from "next";
import { fraunces, inter, ibmPlexMono } from "@/components/landing/fonts";
import { RevealObserver } from "@/components/RevealObserver";
import "./globals.css";


export const metadata: Metadata = {
  title: "Fine Print Fighter — make your case",
  description: "Inspect a company rejection, find the evidence gap, and prepare a cited response you review and send.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable}`}><body><RevealObserver />{children}</body></html>;
}
