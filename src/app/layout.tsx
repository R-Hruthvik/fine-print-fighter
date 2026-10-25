import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { RevealObserver } from "@/components/RevealObserver";
import "./globals.css";

const interfaceFont = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-interface" });

export const metadata: Metadata = {
  title: "Fine Print Fighter — make your case",
  description: "Inspect a company rejection, find the evidence gap, and prepare a cited response you review and send.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={interfaceFont.variable}><body><RevealObserver />{children}</body></html>;
}
