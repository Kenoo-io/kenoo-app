export type TimezoneGroup =
  | "Africa"
  | "Americas"
  | "Antarctica"
  | "Asia"
  | "Atlantic"
  | "Australia"
  | "Europe"
  | "Indian"
  | "Pacific"
  | "Other";

export interface TimezoneOption {
  id: string;
  label: string;
  group: TimezoneGroup;
}

const GROUP_LABELS: Record<string, TimezoneGroup> = {
  Africa: "Africa",
  America: "Americas",
  Antarctica: "Antarctica",
  Asia: "Asia",
  Atlantic: "Atlantic",
  Australia: "Australia",
  Europe: "Europe",
  Indian: "Indian",
  Pacific: "Pacific",
};

function timezoneGroup(timezone: string): TimezoneGroup {
  return GROUP_LABELS[timezone.split("/")[0]] ?? "Other";
}

function timezoneLabel(timezone: string): string {
  const parts = timezone.split("/").slice(1).map((part) =>
    part.replace(/_/g, " "),
  );

  if (parts.length === 0) return timezone;
  if (parts.length === 1) return parts[0];

  // City-first labels are easier to scan and match the style used by Google
  // Calendar while retaining the parent region for less familiar locations.
  return `${parts[parts.length - 1]} (${parts.slice(0, -1).join(" / ")})`;
}

const FALLBACK_TIMEZONES = [
  "America/Cayman",
  "America/New_York",
  "America/Toronto",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

/**
 * IANA timezone IDs supported by the runtime. These IDs are stored directly
 * in users.timezone so date-fns, Luxon, and Intl can apply DST rules correctly.
 * UTC is added because it is omitted by Intl.supportedValuesOf("timeZone").
 */
const supportedTimezones =
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : [...FALLBACK_TIMEZONES];

export const COMMON_TIMEZONES: TimezoneOption[] = [
  ...supportedTimezones,
  "UTC",
].map((id) => ({
  id,
  label: id === "UTC" ? "UTC" : timezoneLabel(id),
  group: id === "UTC" ? "Other" : timezoneGroup(id),
}));
