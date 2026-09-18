/**
 * Algorithmic auto-scheduler for project tasks.
 * Finds open slots inside a user_schedule, avoiding calendar events
 * (including expanded recurring instances) and existing task schedule blocks.
 */

import { DateTime, Info } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildRecurringExceptionMaps,
  filterMeetingsHidingRecurringExceptions,
  generateRecurringCalendarInstances,
  parseCalendarToDateTime,
  resolveViewerFallbackZone,
  type RecurrenceRule,
  type RecurringInstanceOverrideRow,
} from "@/lib/calendar-recurring";

export type BusyInterval = {
  startMs: number;
  endMs: number;
};

export type ScheduleDayInterval = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type AutoScheduleRequest = {
  userScheduleId: string;
  durationMinutes: number;
  allowSplitBlocks?: boolean;
  minBlockMinutes?: number;
  /** yyyy-MM-dd — prefer searching from this day when not urgent */
  preferredDate?: string | null;
  /** yyyy-MM-dd */
  dueDate?: string | null;
  /** 1=Urgent … 4=Low */
  priority?: number | null;
  isBlocking?: boolean;
  /** When editing, ignore this task's existing schedule rows */
  excludeTaskId?: string | null;
  /** Whose task schedules to treat as busy (defaults to current user) */
  assigneeId?: string | null;
  /** IANA zone override (defaults to users.timezone) */
  timezone?: string | null;
};

export type AutoScheduleSlot = {
  start_time: string;
  end_time: string;
  /** Wall-clock helpers for UI in the user's timezone */
  date: string;
  start: string;
  end: string;
};

export type AutoScheduleResult = {
  slots: AutoScheduleSlot[];
  timezone: string;
  urgencyScore: number;
  searchDays: number;
};

const SLOT_STEP_MINUTES = 15;
const MAX_HORIZON_DAYS = 60;

function parseHhMm(time: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return { hour, minute };
}

function mergeIntervals(intervals: BusyInterval[]): BusyInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
  const out: BusyInterval[] = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const last = out[out.length - 1]!;
    if (cur.startMs <= last.endMs) {
      last.endMs = Math.max(last.endMs, cur.endMs);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

function subtractBusy(
  windowStartMs: number,
  windowEndMs: number,
  busy: BusyInterval[]
): BusyInterval[] {
  if (windowEndMs <= windowStartMs) return [];
  const overlapping = busy.filter(
    (b) => b.endMs > windowStartMs && b.startMs < windowEndMs
  );
  if (overlapping.length === 0) {
    return [{ startMs: windowStartMs, endMs: windowEndMs }];
  }

  const free: BusyInterval[] = [];
  let cursor = windowStartMs;
  for (const b of overlapping) {
    const busyStart = Math.max(b.startMs, windowStartMs);
    const busyEnd = Math.min(b.endMs, windowEndMs);
    if (busyStart > cursor) {
      free.push({ startMs: cursor, endMs: busyStart });
    }
    cursor = Math.max(cursor, busyEnd);
  }
  if (cursor < windowEndMs) {
    free.push({ startMs: cursor, endMs: windowEndMs });
  }
  return free;
}

function ceilToStep(ms: number, zone: string, stepMinutes: number): number {
  const dt = DateTime.fromMillis(ms, { zone });
  const minutes = dt.hour * 60 + dt.minute;
  const rem = minutes % stepMinutes;
  if (rem === 0 && dt.second === 0 && dt.millisecond === 0) {
    return dt.toMillis();
  }
  const add = rem === 0 ? stepMinutes : stepMinutes - rem;
  return dt
    .startOf("minute")
    .plus({ minutes: add })
    .set({ second: 0, millisecond: 0 })
    .toMillis();
}

/**
 * Urgency score drives how aggressively we pack early and how far we search.
 * Priority 1 (Urgent) and overdue due dates dominate.
 */
export function computeUrgencyScore(options: {
  priority?: number | null;
  dueDate?: string | null;
  now?: DateTime;
  zone?: string;
}): number {
  const zone = options.zone ?? "UTC";
  const now = options.now ?? DateTime.now().setZone(zone);
  const priority = options.priority ?? 3;

  const priorityWeight =
    priority <= 1 ? 100 : priority === 2 ? 70 : priority === 3 ? 40 : 20;

  let dueWeight = 15;
  if (options.dueDate) {
    const due = DateTime.fromISO(options.dueDate, { zone }).startOf("day");
    if (due.isValid) {
      const daysUntil = Math.floor(due.diff(now.startOf("day"), "days").days);
      if (daysUntil < 0) {
        // Extremely overdue → heavy weight
        dueWeight = Math.min(160, 90 + Math.abs(daysUntil) * 12);
      } else if (daysUntil === 0) {
        dueWeight = 95;
      } else if (daysUntil <= 2) {
        dueWeight = 75;
      } else if (daysUntil <= 7) {
        dueWeight = 50;
      } else if (daysUntil <= 14) {
        dueWeight = 30;
      } else {
        dueWeight = 15;
      }
    }
  }

  return priorityWeight + dueWeight;
}

function searchHorizonDays(urgency: number, dueDate: string | null | undefined, zone: string): number {
  const now = DateTime.now().setZone(zone).startOf("day");
  let horizon = urgency >= 150 ? 10 : urgency >= 110 ? 14 : urgency >= 80 ? 21 : 28;

  if (dueDate) {
    const due = DateTime.fromISO(dueDate, { zone }).startOf("day");
    if (due.isValid) {
      const daysUntil = Math.ceil(due.diff(now, "days").days);
      if (daysUntil >= 0) {
        // Prefer finishing on/before due when possible; leave a little slack after
        horizon = Math.max(horizon, Math.min(MAX_HORIZON_DAYS, daysUntil + 3));
      }
    }
  }

  return Math.min(MAX_HORIZON_DAYS, Math.max(7, horizon));
}

function toSlot(startMs: number, endMs: number, zone: string): AutoScheduleSlot {
  const start = DateTime.fromMillis(startMs, { zone });
  const end = DateTime.fromMillis(endMs, { zone });
  return {
    start_time: start.toUTC().toISO()!,
    end_time: end.toUTC().toISO()!,
    date: start.toFormat("yyyy-MM-dd"),
    start: start.toFormat("HH:mm"),
    end: end.toFormat("HH:mm"),
  };
}

type CandidatePack = {
  slots: AutoScheduleSlot[];
  score: number;
};

function scorePack(
  slots: AutoScheduleSlot[],
  options: {
    urgency: number;
    dueDate?: string | null;
    preferredDate?: string | null;
    zone: string;
    nowMs: number;
  }
): number {
  if (slots.length === 0) return -Infinity;
  const first = DateTime.fromISO(slots[0]!.start_time);
  if (!first.isValid) return -Infinity;

  const startMs = first.toMillis();
  const daysFromNow = (startMs - options.nowMs) / 86_400_000;

  // Higher urgency → stronger preference for sooner
  const soonWeight = options.urgency / 40;
  let score = 1000 - daysFromNow * soonWeight * 40;

  // Prefer contiguous single block slightly over many tiny splits
  score -= (slots.length - 1) * 8;

  if (options.dueDate) {
    const due = DateTime.fromISO(options.dueDate, { zone: options.zone }).endOf("day");
    if (due.isValid) {
      const lastEnd = DateTime.fromISO(slots[slots.length - 1]!.end_time);
      if (lastEnd.isValid && lastEnd.toMillis() <= due.toMillis()) {
        score += 80 + options.urgency * 0.15;
      } else if (lastEnd.isValid) {
        // After due date — still allow but heavily penalize
        score -= 200 + options.urgency * 0.5;
      }
    }
  }

  if (options.preferredDate && options.urgency < 120) {
    const preferred = DateTime.fromISO(options.preferredDate, {
      zone: options.zone,
    }).startOf("day");
    if (preferred.isValid) {
      const dayDiff = Math.abs(
        first.startOf("day").diff(preferred, "days").days
      );
      score += Math.max(0, 35 - dayDiff * 8);
    }
  }

  // Slight preference for morning for urgent work
  if (options.urgency >= 120 && first.hour < 12) {
    score += 12;
  }

  return score;
}

function findSingleSlotInGaps(
  gaps: BusyInterval[],
  durationMs: number,
  zone: string,
  notBeforeMs: number
): BusyInterval | null {
  for (const gap of gaps) {
    let start = Math.max(gap.startMs, notBeforeMs);
    start = ceilToStep(start, zone, SLOT_STEP_MINUTES);
    if (start + durationMs <= gap.endMs) {
      return { startMs: start, endMs: start + durationMs };
    }
  }
  return null;
}

function findSplitSlotsInGaps(
  gaps: BusyInterval[],
  durationMinutes: number,
  minBlockMinutes: number,
  zone: string,
  notBeforeMs: number
): BusyInterval[] | null {
  const needMs = durationMinutes * 60_000;
  const minMs = Math.max(SLOT_STEP_MINUTES, minBlockMinutes) * 60_000;
  const chunks: BusyInterval[] = [];
  let remaining = needMs;

  for (const gap of gaps) {
    if (remaining <= 0) break;
    let cursor = Math.max(gap.startMs, notBeforeMs);
    cursor = ceilToStep(cursor, zone, SLOT_STEP_MINUTES);

    while (cursor + minMs <= gap.endMs && remaining > 0) {
      const avail = gap.endMs - cursor;
      // Prefer taking as much as needed, but at least min block when splitting
      let take = Math.min(remaining, avail);
      // Snap take down to step
      take = Math.floor(take / (SLOT_STEP_MINUTES * 60_000)) * (SLOT_STEP_MINUTES * 60_000);
      if (take < minMs && remaining > minMs) {
        // Not enough room for another min block in this gap
        break;
      }
      if (take < minMs && remaining <= minMs) {
        // Last remnant — take if gap fits remaining
        if (avail < remaining) break;
        take = remaining;
      }
      if (take <= 0) break;

      // If this isn't the final chunk and leftover would be < min, shrink take
      if (remaining - take > 0 && remaining - take < minMs) {
        const adjusted = remaining - minMs;
        if (adjusted >= minMs) take = adjusted;
      }

      chunks.push({ startMs: cursor, endMs: cursor + take });
      remaining -= take;
      cursor = ceilToStep(cursor + take, zone, SLOT_STEP_MINUTES);
    }
  }

  if (remaining > 0) return null;
  return chunks;
}

export async function loadBusyIntervals(options: {
  supabase: SupabaseClient;
  userId: string;
  assigneeId: string;
  rangeStartIso: string;
  rangeEndIso: string;
  horizonDays: number;
  excludeTaskId?: string | null;
}): Promise<BusyInterval[]> {
  const {
    supabase,
    userId,
    assigneeId,
    rangeStartIso,
    rangeEndIso,
    horizonDays,
    excludeTaskId,
  } = options;

  const busy: BusyInterval[] = [];

  // Regular (non-parent) calendar events — Google-synced + others via calendar_view
  const { data: meetingsData } = await supabase
    .from("calendar_view")
    .select(
      "id, title, start_time, end_time, meeting_link, event_id, account_id, user_id, is_recurring_parent, location, html_link, status"
    )
    .eq("user_id", userId)
    .eq("is_recurring_parent", false)
    .gte("end_time", rangeStartIso)
    .lte("start_time", rangeEndIso)
    .order("start_time", { ascending: true });

  const exceptionSelectWithType =
    "id, account_id, event_id, recurring_event_id, original_start_time, exception_type, status";
  const exceptionSelectFallback =
    "id, account_id, event_id, recurring_event_id, original_start_time, status";

  let exceptionRows: RecurringInstanceOverrideRow[] = [];
  const exceptionWithType = await supabase
    .from("calendar_events")
    .select(exceptionSelectWithType)
    .eq("user_id", userId)
    .not("recurring_event_id", "is", null);

  if (!exceptionWithType.error) {
    exceptionRows = (exceptionWithType.data || []) as RecurringInstanceOverrideRow[];
  } else {
    const exceptionFallback = await supabase
      .from("calendar_events")
      .select(exceptionSelectFallback)
      .eq("user_id", userId)
      .not("recurring_event_id", "is", null);
    if (!exceptionFallback.error) {
      exceptionRows = (exceptionFallback.data || []) as RecurringInstanceOverrideRow[];
    }
  }

  const exceptionMaps = buildRecurringExceptionMaps(exceptionRows);
  const visibleMeetings = filterMeetingsHidingRecurringExceptions(
    meetingsData || [],
    exceptionMaps
  );

  for (const event of visibleMeetings) {
    const start = parseCalendarToDateTime(String(event.start_time));
    const end = parseCalendarToDateTime(String(event.end_time));
    if (!start.isValid || !end.isValid || end <= start) continue;
    busy.push({ startMs: start.toMillis(), endMs: end.toMillis() });
  }

  // Recurring parents → expand like the calendar UI
  const { data: recurringEventsData } = await supabase
    .from("calendar_view")
    .select(
      "id, title, start_time, end_time, start_timezone, end_timezone, meeting_link, html_link, event_id, account_id, user_id, is_recurring_parent, until, location"
    )
    .eq("user_id", userId)
    .eq("is_recurring_parent", true)
    .order("start_time", { ascending: true });

  const nowDate = new Date();
  const activeRecurring = (recurringEventsData || []).filter((event) => {
    if (!event.until) return true;
    return new Date(String(event.until)) >= nowDate;
  });

  if (activeRecurring.length > 0) {
    const eventIds = Array.from(
      new Set(activeRecurring.map((e) => e.event_id).filter(Boolean))
    ) as string[];

    const { data: recurrencesData } = await supabase
      .from("calendar_recurrences")
      .select("account_id, parent_event_id, freq, interval, byday, until, count")
      .in("parent_event_id", eventIds);

    const recurrenceMap = new Map<string, RecurrenceRule>();
    for (const rec of recurrencesData || []) {
      recurrenceMap.set(`${rec.account_id}|${rec.parent_event_id}`, {
        freq: rec.freq ?? "",
        interval: rec.interval,
        byday: rec.byday,
        until: rec.until,
        count: rec.count,
      });
    }

    const { data: originalStartRows } = await supabase
      .from("calendar_events")
      .select("account_id, event_id, original_start_time")
      .eq("user_id", userId)
      .in("event_id", eventIds);

    const originalStartByKey = new Map<string, string | null>();
    for (const r of originalStartRows || []) {
      originalStartByKey.set(
        `${r.account_id}|${r.event_id}`,
        r.original_start_time
      );
    }

    for (const event of activeRecurring) {
      const key = `${event.account_id}|${event.event_id}`;
      const rule = recurrenceMap.get(key);
      if (!rule) continue;

      const rows = generateRecurringCalendarInstances(
        {
          id: event.id,
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          start_timezone: event.start_timezone,
          end_timezone: event.end_timezone,
          meeting_link: event.meeting_link,
          html_link: event.html_link,
          original_start_time: originalStartByKey.get(key) ?? null,
          location: event.location,
        },
        rule,
        {
          maxInstances: 120,
          horizonDays: Math.min(365, Math.max(14, horizonDays + 7)),
          suppressedSlotStartMs:
            exceptionMaps.suppressedSlotStartMsByParent.get(key),
        }
      );

      for (const inst of rows) {
        const start = parseCalendarToDateTime(inst.start_time);
        const end = parseCalendarToDateTime(inst.end_time);
        if (!start.isValid || !end.isValid || end <= start) continue;
        if (end.toMillis() < DateTime.fromISO(rangeStartIso).toMillis()) continue;
        if (start.toMillis() > DateTime.fromISO(rangeEndIso).toMillis()) continue;
        busy.push({ startMs: start.toMillis(), endMs: end.toMillis() });
      }
    }
  }

  // Existing task time blocks for the assignee (avoid double-booking work)
  const { data: assigneeTasks } = await supabase
    .from("project_task_assignees")
    .select("task_id")
    .eq("user_id", assigneeId);

  const taskIds = (assigneeTasks || [])
    .map((t) => t.task_id as string)
    .filter((id) => (excludeTaskId ? id !== excludeTaskId : true));

  if (taskIds.length > 0) {
    const { data: taskSchedules } = await supabase
      .from("project_task_schedules")
      .select("id, task_id, start_time, end_time, is_blocking")
      .in("task_id", taskIds)
      .gte("end_time", rangeStartIso)
      .lte("start_time", rangeEndIso);

    for (const row of taskSchedules || []) {
      const start = parseCalendarToDateTime(String(row.start_time));
      const end = parseCalendarToDateTime(String(row.end_time));
      if (!start.isValid || !end.isValid || end <= start) continue;
      busy.push({ startMs: start.toMillis(), endMs: end.toMillis() });
    }
  }

  return mergeIntervals(busy);
}

export async function findAutoScheduleSlots(
  supabase: SupabaseClient,
  userId: string,
  request: AutoScheduleRequest
): Promise<AutoScheduleResult> {
  const durationMinutes = Math.max(15, Math.round(request.durationMinutes));
  const allowSplit = request.allowSplitBlocks === true;
  const minBlockMinutes = Math.max(
    SLOT_STEP_MINUTES,
    Math.min(durationMinutes, request.minBlockMinutes ?? 30)
  );
  const assigneeId = request.assigneeId || userId;

  const { data: userRow } = await supabase
    .from("users")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();

  const zone = resolveViewerFallbackZone(
    request.timezone ?? userRow?.timezone ?? null
  );
  if (!Info.isValidIANAZone(zone)) {
    throw new Error("Invalid timezone");
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from("user_schedules")
    .select(
      "id, name, kind, user_schedule_days ( day_of_week, start_time, end_time )"
    )
    .eq("id", request.userScheduleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (scheduleError) throw scheduleError;
  if (!schedule) {
    throw new Error("Schedule not found");
  }

  const dayIntervals = new Map<number, { start: string; end: string }[]>();
  const daysRaw = Array.isArray(schedule.user_schedule_days)
    ? schedule.user_schedule_days
    : [];
  for (const day of daysRaw) {
    const start = String(day.start_time ?? "").slice(0, 5);
    const end = String(day.end_time ?? "").slice(0, 5);
    if (!parseHhMm(start) || !parseHhMm(end)) continue;
    const dow = Number(day.day_of_week);
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) continue;
    const list = dayIntervals.get(dow) ?? [];
    list.push({ start, end });
    dayIntervals.set(dow, list);
  }
  for (const [dow, list] of dayIntervals) {
    list.sort((a, b) => a.start.localeCompare(b.start));
    dayIntervals.set(dow, list);
  }

  if (dayIntervals.size === 0) {
    throw new Error("Schedule has no active days. Add hours in Settings.");
  }

  const now = DateTime.now().setZone(zone);
  const urgency = computeUrgencyScore({
    priority: request.priority,
    dueDate: request.dueDate,
    now,
    zone,
  });
  const horizonDays = searchHorizonDays(urgency, request.dueDate, zone);

  // Search start day: urgent/overdue → today; otherwise prefer preferredDate/dueDate
  let searchStart = now.startOf("day");
  if (urgency < 120) {
    const preferredRaw = request.preferredDate || request.dueDate;
    if (preferredRaw) {
      const preferred = DateTime.fromISO(preferredRaw, { zone }).startOf("day");
      if (preferred.isValid && preferred >= searchStart) {
        searchStart = preferred;
      }
    }
  }

  const rangeStart = now;
  const rangeEnd = searchStart.plus({ days: horizonDays }).endOf("day");

  const busy = await loadBusyIntervals({
    supabase,
    userId,
    assigneeId,
    rangeStartIso: rangeStart.toUTC().toISO()!,
    rangeEndIso: rangeEnd.toUTC().toISO()!,
    horizonDays,
    excludeTaskId: request.excludeTaskId,
  });

  const durationMs = durationMinutes * 60_000;
  const candidates: CandidatePack[] = [];
  const notBeforeMs = now.toMillis();

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset++) {
    const day = searchStart.plus({ days: dayOffset });
    // Luxon weekday: Mon=1…Sun=7 → JS getDay Sunday=0
    const jsDow = day.weekday === 7 ? 0 : day.weekday;
    const intervals = dayIntervals.get(jsDow);
    if (!intervals || intervals.length === 0) continue;

    const dayGaps: BusyInterval[] = [];
    for (const interval of intervals) {
      const startParts = parseHhMm(interval.start);
      const endParts = parseHhMm(interval.end);
      if (!startParts || !endParts) continue;

      const windowStart = day.set({
        hour: startParts.hour,
        minute: startParts.minute,
        second: 0,
        millisecond: 0,
      });
      const windowEnd = day.set({
        hour: endParts.hour,
        minute: endParts.minute,
        second: 0,
        millisecond: 0,
      });
      if (windowEnd <= windowStart) continue;

      const free = subtractBusy(
        windowStart.toMillis(),
        windowEnd.toMillis(),
        busy
      );
      dayGaps.push(...free);
    }

    dayGaps.sort((a, b) => a.startMs - b.startMs);
    if (dayGaps.length === 0) continue;

    if (!allowSplit) {
      const single = findSingleSlotInGaps(
        dayGaps,
        durationMs,
        zone,
        notBeforeMs
      );
      if (single) {
        const slots = [toSlot(single.startMs, single.endMs, zone)];
        candidates.push({
          slots,
          score: scorePack(slots, {
            urgency,
            dueDate: request.dueDate,
            preferredDate: request.preferredDate,
            zone,
            nowMs: notBeforeMs,
          }),
        });
        // High urgency: take first viable day quickly
        if (urgency >= 140) break;
      }
    } else {
      const split = findSplitSlotsInGaps(
        dayGaps,
        durationMinutes,
        minBlockMinutes,
        zone,
        notBeforeMs
      );
      if (split) {
        const slots = split.map((c) => toSlot(c.startMs, c.endMs, zone));
        candidates.push({
          slots,
          score: scorePack(slots, {
            urgency,
            dueDate: request.dueDate,
            preferredDate: request.preferredDate,
            zone,
            nowMs: notBeforeMs,
          }),
        });
        if (urgency >= 140) break;
      }
    }
  }

  // If preferred-date search found nothing and we started later than today, also scan from today
  if (candidates.length === 0 && searchStart > now.startOf("day")) {
    const fromToday = await findAutoScheduleSlots(supabase, userId, {
      ...request,
      preferredDate: now.toFormat("yyyy-MM-dd"),
    });
    return fromToday;
  }

  if (candidates.length === 0) {
    return {
      slots: [],
      timezone: zone,
      urgencyScore: urgency,
      searchDays: horizonDays,
    };
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0]!;

  return {
    slots: best.slots.map((s) => ({
      ...s,
      // ensure is_blocking is applied by caller; slots are pure times
    })),
    timezone: zone,
    urgencyScore: urgency,
    searchDays: horizonDays,
  };
}
