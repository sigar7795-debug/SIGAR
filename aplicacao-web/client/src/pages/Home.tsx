import { AudiencesSection } from "@/components/landing/AudiencesSection";
import { EditorialBand } from "@/components/landing/EditorialBand";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { FinancialPreview } from "@/components/landing/FinancialPreview";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { ScrollRevealTransition } from "@/components/landing/ScrollRevealTransition";
import { useSmoothScroll } from "@/components/landing/useSmoothScroll";
import { WhySigarSection } from "@/components/landing/WhySigarSection";

/**
 * Public SIGAR homepage. Fully static/illustrative — no protected tRPC calls run here.
 * Narrative: PAISAGEM → PROPRIEDADE → DADOS → DECISÃO.
 */
export default function Home() {
  useSmoothScroll();

  return (
    <div className="min-h-screen overflow-x-clip">
      <LandingHeader />
      <main>
        <Hero />
        <WhySigarSection />
        <ScrollRevealTransition />
        <EditorialBand />
        <FinancialPreview />
        <HowItWorks />
        <AudiencesSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
