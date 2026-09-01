import { Suspense } from "react";

import AgentPitches from "@/components/agentCRM/agentPitches/index/agent-pitches";

export const dynamic = "force-dynamic";

export default function PitchesPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden overscroll-none bg-kenoo-white">
      <Suspense fallback={null}>
        <AgentPitches analyticsData={null} />
      </Suspense>
    </div>
  );
}
