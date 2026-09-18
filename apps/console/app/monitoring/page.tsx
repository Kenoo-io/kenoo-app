import { MonitoringDashboard } from "@/components/console/monitoring/monitoring-dashboard";
import { PageShell } from "@/components/console/page-shell";

export default function MonitoringPage() {
  return (
    <PageShell
      title="Infrastructure monitoring"
      description="Operational health, workload volume, and provider connections across Kenoo systems."
    >
      <MonitoringDashboard />
    </PageShell>
  );
}
