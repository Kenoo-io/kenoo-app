import AgentCalendar from "@/components/calendar/agent-calendar";

export default function CalendarPage() {
  // Keep the initial calendar day identical for the server render and the
  // browser hydration pass. The calendar switches to live client time only
  // after hydration where it needs to.
  const initialDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="h-full min-h-0 overflow-hidden overscroll-none bg-kenoo-white">
      <AgentCalendar calendarData={null} initialDate={initialDate} />
    </div>
  );
}
