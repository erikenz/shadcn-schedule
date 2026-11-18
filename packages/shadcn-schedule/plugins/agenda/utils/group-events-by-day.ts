import { Temporal } from "temporal-polyfill";

import type { CalendarEvent } from "@/types/index";
import {
  endOf,
  format,
  isSameOrAfter,
  isSameOrBefore,
  startOf,
} from "@/utils/temporal";

export interface AgendaDayGroupData {
  /** Start-of-day for the group. */
  date: Temporal.ZonedDateTime;
  /** Events overlapping the day, sorted all-day first then by start. */
  events: CalendarEvent[];
  /** 'YYYY-MM-DD' for the day. */
  key: string;
}

/**
 * All-day events repeat under each day they span (matching Google's Schedule
 * view); a timed event appears once, under its start day, even if it crosses
 * midnight.
 */
const appearsOnDay = (
  event: CalendarEvent,
  dayStart: Temporal.ZonedDateTime,
  dayEnd: Temporal.ZonedDateTime
): boolean => {
  if (event.allDay === true) {
    return (
      isSameOrBefore(event.start, dayEnd) && isSameOrAfter(event.end, dayStart)
    );
  }

  return (
    isSameOrAfter(event.start, dayStart) && isSameOrBefore(event.start, dayEnd)
  );
};

const byAllDayThenStart = (a: CalendarEvent, b: CalendarEvent): number => {
  const aRank = a.allDay === true ? 0 : 1;
  const bRank = b.allDay === true ? 0 : 1;

  if (aRank !== bRank) {
    return aRank - bRank;
  }

  return Temporal.ZonedDateTime.compare(a.start, b.start);
};

/**
 * Groups events by calendar day across `range`, dropping empty days. All-day
 * events repeat under each day they span (clamped to the window); timed events
 * appear once under their start day. Matches the agenda's per-day scanning model.
 */
export const groupEventsByDay = (
  events: CalendarEvent[],
  range: { start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime }
): AgendaDayGroupData[] => {
  const groups: AgendaDayGroupData[] = [];
  const lastDay = startOf(range.end, "day");
  let cursor = startOf(range.start, "day");

  while (isSameOrBefore(cursor, lastDay)) {
    const dayStart = startOf(cursor, "day");
    const dayEnd = endOf(cursor, "day");

    const dayEvents = events
      .filter((event) => appearsOnDay(event, dayStart, dayEnd))
      .toSorted(byAllDayThenStart);

    if (dayEvents.length > 0) {
      groups.push({
        date: dayStart,
        events: dayEvents,
        key: format(cursor, "YYYY-MM-DD"),
      });
    }

    cursor = cursor.add({ days: 1 });
  }

  return groups;
};
