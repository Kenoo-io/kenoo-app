import { Suspense } from "react";

import AgentDeals from "@/components/agentCRM/agentDeals/index/agent-deals";

export const dynamic = "force-dynamic";

export default function DealsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden overscroll-none bg-kenoo-white">
      <Suspense fallback={null}>
        <AgentDeals analyticsData={null} />
      </Suspense>
    </div>
  );
}
