import { CapabilityStrip } from "@/components/kenoo/capability-strip";
import { FeaturedApps } from "@/components/kenoo/featured-apps";
import { FinalCta } from "@/components/kenoo/final-cta";
import { Hero } from "@/components/kenoo/hero";
import { HowItWorks } from "@/components/kenoo/how-it-works";
import { Philosophy } from "@/components/kenoo/philosophy";
import { Reliability } from "@/components/kenoo/reliability";
import { SiteShell } from "@/components/kenoo/site-shell";
import { SuiteShowcase } from "@/components/kenoo/suite-showcase";

export default function HomePage() {
  return (
    <SiteShell>
      <Hero />
      <CapabilityStrip />
      <SuiteShowcase />
      <FeaturedApps />
      <HowItWorks />
      <Philosophy />
      <Reliability />
      <FinalCta />
    </SiteShell>
  );
}
