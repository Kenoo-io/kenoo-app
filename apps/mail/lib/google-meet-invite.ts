export type InviteResponse = "accepted" | "declined" | "tentative";

export interface GoogleMeetInvite {
  summary: string;
  start: string;
  end: string;
  timeZone?: string;
  meetingUrl?: string;
  organizer?: string;
  organizerName?: string;
  iCalUid?: string;
  googleEventId?: string;
}

function htmlToText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function unfoldIcsLines(value: string) {
  return value.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
}

function icsValue(lines: string[], key: string) {
  const line = lines.find((entry) => entry.toUpperCase().startsWith(`${key.toUpperCase()}:`));
  return line?.slice(line.indexOf(":") + 1).trim();
}

function parseIcsDate(value?: string) {
  if (!value) return undefined;
  const normalized = value.replace(/Z$/, "");
  const match = normalized.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
  if (!match) return undefined;
  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${value.endsWith("Z") ? "Z" : ""}`;
}

function parseInviteDate(source: string, visibleText = source) {
  // Google Calendar's rendered invitation text commonly contains an ISO-like
  // timestamp in the hidden calendar payload, which is the least ambiguous source.
  const icsStart = source.match(/DTSTART(?:;[^:]+)?:([^\s<]+)/i)?.[1]
    || source.match(/itemprop=["']startDate["'][^>]*datetime=["']([^"']+)/i)?.[1];
  const icsEnd = source.match(/DTEND(?:;[^:]+)?:([^\s<]+)/i)?.[1]
    || source.match(/itemprop=["']endDate["'][^>]*datetime=["']([^"']+)/i)?.[1];
  const fromIcs = { start: parseIcsDate(icsStart), end: parseIcsDate(icsEnd) };
  if (fromIcs.start && fromIcs.end) return fromIcs;

  // Fallback for providers that flatten the calendar part into the rendered
  // body. Keep this deliberately strict; an invitation without an end time
  // should not create a misleading calendar event.
  const rendered = visibleText.match(
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+([A-Z][a-z]{2}\s+\d{1,2}(?:,\s*\d{4})?)\s*(?:[·•⋅-]\s*)?(\d{1,2}:\d{2}\s*[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s*[AP]M)/i,
  );
  if (!rendered) return fromIcs;
  const datePart = rendered[1].includes(",") ? rendered[1] : `${rendered[1]}, ${new Date().getFullYear()}`;
  const start = new Date(`${datePart} ${rendered[2]}`);
  const end = new Date(`${datePart} ${rendered[3]}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fromIcs;
  return { start: start.toISOString(), end: end.toISOString() };
}

export function parseGoogleMeetInvite(subject: string, htmlContent = "", textContent = ""): GoogleMeetInvite | null {
  const source = `${subject}\n${htmlContent}\n${textContent}`;
  const plainText = htmlToText(source);
  const rawMeetingUrl = plainText.match(/(?:https?:\/\/)?meet\.google\.com\/[a-z0-9-]+/i)?.[0];
  const meetingUrl = rawMeetingUrl
    ? (rawMeetingUrl.startsWith("http") ? rawMeetingUrl : `https://${rawMeetingUrl}`)
    : undefined;
  const invitationLanguage = /(invitation|invited you|calendar event|event invitation|you'?re invited)/i.test(
    `${subject} ${plainText}`,
  );
  const isInvitationSubject = /^(invitation|invite):/i.test(subject.trim());
  if ((!meetingUrl && !isInvitationSubject) || !invitationLanguage) return null;

  const lines = unfoldIcsLines(source);
  const icsSummary = icsValue(lines, "SUMMARY");
  // Parse the rendered text, not the raw HTML. Google Calendar emails place
  // tags/entities between the visible date and time values.
  const parsedDates = parseInviteDate(source, plainText);
  const summary = icsSummary || subject
    .replace(/^(invitation|invite):\s*/i, "")
    .replace(/\s+@\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[^\n]+$/i, "")
    .trim() || "Google Meet event";
  const organizerMatch = plainText.match(/Organizer\s+(.+?)\s+([^\s]+@[^\s]+)\s+Guests/i);
  const organizerName = source.match(/itemprop=["']description["'][^>]*content=["']Invitation from ([^"']+)/i)?.[1]
    || organizerMatch?.[1]?.trim();
  const organizerEmail = organizerMatch?.[2]
    || icsValue(lines, "ORGANIZER")?.replace(/^.*?mailto:/i, "");
  const googleEventId = source.match(/itemprop=["']eventId\/googleCalendar["'][^>]*content=["']([^"']+)/i)?.[1];

  // Without a calendar payload we cannot safely create an event: the visible
  // email text is not a reliable source for timezone or end-time data.
  if (!parsedDates.start || !parsedDates.end) return null;

  return {
    summary,
    start: parsedDates.start,
    end: parsedDates.end,
    timeZone: source.match(/TZID=([^:;\s]+)/i)?.[1],
    meetingUrl,
    organizer: organizerEmail,
    organizerName,
    iCalUid: icsValue(lines, "UID"),
    googleEventId,
  };
}
