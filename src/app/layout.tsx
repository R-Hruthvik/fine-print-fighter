import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fine Print Fighter — make your case",
  description: "Turn a bill, notice, or company email into an evidence-backed case analysis, an editable complaint letter, and escalation options. You review and send.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
