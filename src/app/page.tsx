import { fraunces, inter, ibmPlexMono } from "@/components/landing/fonts";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import Ticker from "@/components/landing/Ticker";
import HowItWorks from "@/components/landing/HowItWorks";
import SampleReview from "@/components/landing/SampleReview";
import Footer from "@/components/landing/Footer";
import styles from "@/components/landing/landing.module.css";

export default function Home() {
  return (
    <div className={`${styles.root} ${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable}`}>
      <Nav />
      <main id="main-content">
        <Hero />
        <Ticker />
        <HowItWorks />
        <SampleReview />
      </main>
      <Footer />
    </div>
  );
}
