import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fine Print Fighter — make your case",
  description: "Inspect a company rejection, find the evidence gap, and prepare a cited response you review and send.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
