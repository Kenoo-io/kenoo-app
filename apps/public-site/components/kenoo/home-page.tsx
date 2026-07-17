import { FinalCta } from "@/components/kenoo/final-cta";
import { Hero } from "@/components/kenoo/hero";
import { Philosophy } from "@/components/kenoo/philosophy";
import { Reliability } from "@/components/kenoo/reliability";
import { SiteShell } from "@/components/kenoo/site-shell";
import { SuiteShowcase } from "@/components/kenoo/suite-showcase";

export default function HomePage() {
  return (
    <SiteShell>
      <Hero />
      <Philosophy />
      <SuiteShowcase />
      <Reliability />
      <FinalCta />
    </SiteShell>
  );
}
