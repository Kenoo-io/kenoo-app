"use client";

import { OpportunitySignalsSection } from "./opportunity-signals-section";
import { RecentPartnershipsSection } from "./recent-partnerships-section";
import { HotTalentSection } from "./hot-talent-section";
import { HotCategoriesSection } from "./hot-categories-section";

export default function PartnerHubOverview({
  analyticsData: _analyticsData,
}: {
  analyticsData: unknown;
}) {
  return (
    <div className="w-full pb-12 pl-8 pr-4 md:pr-6">
      <OpportunitySignalsSection />
      <RecentPartnershipsSection />
      <HotTalentSection />
      <HotCategoriesSection />
    </div>
  );
}
