import { NextResponse } from "next/server";
import { createAdminClient } from "@walls/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";

const responseStatuses = new Set(["accepted", "declined", "tentative"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: appUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", user.email)
    .limit(1)
    .maybeSingle();
  if (!appUser?.id) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const body = await request.json() as {
    response?: string;
    summary?: string;
    start?: string;
    end?: string;
    timeZone?: string;
    meetingUrl?: string;
    organizer?: string;
    iCalUid?: string;
    googleEventId?: string;
  };
  if (!responseStatuses.has(body.response ?? "") || !body.summary || !body.start || !body.end) {
    return NextResponse.json({ error: "Invalid invitation response" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("user_connections")
    .select("refresh_token, access_token, token_expiry")
    .eq("user_id", appUser.id)
    .eq("provider", "google")
    .eq("service", "calendar")
    .is("revoked_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!connection?.refresh_token) return NextResponse.json({ error: "Google Calendar is not connected" }, { status: 409 });

  const oauth = new google.auth.OAuth2(process.env.GOOGLE_WALLS_CLIENT_ID, process.env.GOOGLE_WALLS_CLIENT_SECRET);
  oauth.setCredentials({ refresh_token: connection.refresh_token, access_token: connection.access_token ?? undefined });
  const calendar = google.calendar({ version: "v3", auth: oauth });

  try {
    if (body.googleEventId) {
      const existingEvent = await calendar.events.get({
        calendarId: "primary",
        eventId: body.googleEventId,
      });
      const currentEmail = user.email.toLowerCase();
      const attendees = (existingEvent.data.attendees ?? [])
        .filter((attendee) => attendee.email)
        .map((attendee) => ({
          email: attendee.email!,
          responseStatus: attendee.email!.toLowerCase() === currentEmail
            ? body.response
            : attendee.responseStatus,
        }));
      if (!attendees.some((attendee) => attendee.email.toLowerCase() === currentEmail)) {
        attendees.push({ email: user.email, responseStatus: body.response });
      }
      await calendar.events.patch({
        calendarId: "primary",
        eventId: body.googleEventId,
        sendUpdates: "all",
        requestBody: { attendees },
      });
      return NextResponse.json({ ok: true, eventId: body.googleEventId });
    }

    const event = await calendar.events.insert({
      calendarId: "primary",
      sendUpdates: "all",
      requestBody: {
        iCalUID: body.iCalUid,
        summary: body.summary,
        start: { dateTime: body.start, timeZone: body.timeZone },
        end: { dateTime: body.end, timeZone: body.timeZone },
        location: body.meetingUrl,
        description: body.meetingUrl ? `Google Meet\n${body.meetingUrl}` : undefined,
        attendees: [{ email: user.email, responseStatus: body.response }],
        organizer: body.organizer ? { email: body.organizer } : undefined,
      },
    });
    return NextResponse.json({ ok: true, eventId: event.data.id });
  } catch (error) {
    const apiError = error as { code?: number; message?: string; response?: { data?: { error?: { message?: string } } } };
    const status = apiError.code;
    const details = apiError.response?.data?.error?.message || apiError.message;
    console.error("[calendar invite RSVP] Google Calendar update failed", { status, details });
    return NextResponse.json(
      {
        error: "Google Calendar could not save this invitation",
        ...(process.env.NODE_ENV === "development" && details ? { details } : {}),
      },
      { status: status === 401 ? 401 : status === 404 ? 404 : 500 },
    );
  }
}
