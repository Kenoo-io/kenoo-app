import { EventDetailPage } from "@/components/event-detail-page";

export const metadata = { title: "Event details" };

export default async function EventDetailRoute({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <EventDetailPage eventId={eventId} />;
}
