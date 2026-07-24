import { Suspense } from "react";

import PartnerHubPartnerships from "@/components/partnerships/partnerhub-partnerships";

export const dynamic = "force-dynamic";

export default function DealBoardPage() {
  return (
    <div className="app-sidebar-pad flex h-full min-h-0 flex-col overflow-hidden bg-kenoo-white">
      <Suspense fallback={null}>
        <PartnerHubPartnerships analyticsData={null} />
      </Suspense>
    </div>
  );
}
