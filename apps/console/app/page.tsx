import { ConsoleDashboard } from "@/components/console/console-dashboard";
import { PageShell } from "@/components/console/page-shell";

export default function ConsoleHomePage() {
  return (
    <PageShell
      title="Home"
      description="System-wide internals for Kenoo. Only console operators can open this app."
    >
      <ConsoleDashboard />
    </PageShell>
  );
}
