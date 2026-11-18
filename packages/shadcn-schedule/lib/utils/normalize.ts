import type { Temporal } from "temporal-polyfill";

import { WEEK_DAYS_NUMBER_MAP } from "@/lib/constants";
import type { WeekDays } from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

/**
 * Converts an optional WeekDays[] list into a Set<number> of day indices
 * (0 = Sunday, 1 = Monday, ...), or undefined if the list is empty.
 */
export const toHiddenDaysSet = (
  hiddenDays?: WeekDays[]
): Set<number> | undefined => {
  if (!hiddenDays || hiddenDays.length === 0) {
    return undefined;
  }

  return new Set(hiddenDays.map((day) => WEEK_DAYS_NUMBER_MAP[day]));
};

/**
 * Normalizes calendar events from public-facing format to internal format.
 * Converts flexible date types (ZonedDateTime, Date, string) to ZonedDateTimes.
 *
 * @param events - Array of calendar events with flexible date types
 * @returns Normalized array of calendar events with ZonedDateTime dates
 *
 * @example
 * const events = normalizeEvents<CalendarPropEvent, CalendarEvent>(propEvents)
 */
export const normalizeEvents = <
  TInput extends {
    start: Temporal.ZonedDateTime | Date | string;
    end: Temporal.ZonedDateTime | Date | string;
  },
  TOutput extends TInput & {
    start: Temporal.ZonedDateTime;
    end: Temporal.ZonedDateTime;
  },
>(
  events: TInput[] | undefined
): TOutput[] => {
  if (
    events?.length === undefined ||
    events?.length === 0 ||
    Number.isNaN(events?.length)
  ) {
    return [];
  }

  // TS can't relate the two generics structurally, so the final narrowing to
  // TOutput goes through a runtime no-op type predicate instead of a cast.
  return events
    .map((event) => ({
      ...event,
      end: toZonedDateTime(event.end),
      start: toZonedDateTime(event.start),
    }))
    .filter((_value): _value is TOutput => true);
};
