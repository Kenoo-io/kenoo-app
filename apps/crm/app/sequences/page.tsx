import { Suspense } from "react";

import AgentSequences from "@/components/agentCRM/agentSequences/index/agent-sequences";

export const dynamic = "force-dynamic";

export default function SequencesPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden overscroll-none bg-kenoo-white">
      <Suspense fallback={null}>
        <AgentSequences analyticsData={null} />
      </Suspense>
    </div>
  );
}
