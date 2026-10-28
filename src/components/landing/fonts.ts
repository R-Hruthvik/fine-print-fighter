import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";

/**
 * Landing-page fonts, scoped to the Fine Print Fighter homepage.
 * Fraunces (display serif), Inter (body sans), IBM Plex Mono (labels/meta).
 * Each returns a variable class that registers its CSS variable on the element it's applied to.
 */
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
