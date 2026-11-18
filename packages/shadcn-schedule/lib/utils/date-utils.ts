/** Whether the given date falls on today (calendar day, respecting timezone). */

import type { Temporal } from "temporal-polyfill";

import {
  endOf,
  format,
  isBefore,
  isSame,
  now,
  startOf,
} from "@/utils/temporal";

export const isToday = (date: Temporal.ZonedDateTime): boolean =>
  isSame(date, now(), "day");

/** `YYYY-MM-DD` string used as a stable per-day key across the codebase. */
export const getDayKey = (date: Temporal.ZonedDateTime): string =>
  format(date, "YYYY-MM-DD");

/**
 * Calculates the week days for a given date and first day of week setting.
 *
 * This function ensures that the current date is always included in the returned week,
 * even when the first day of week is set to a day after the current date.
 *
 * @param currentDate - The reference date for calculating the week
 * @param firstDayOfWeek - The day number (0-6) representing the first day of the week (0 = Sunday, 1 = Monday, etc.)
 * @returns An array of 7 ZonedDateTimes representing the week days, starting from firstDayOfWeek
 *
 * @example
 * // Get week starting from Monday for current date
 * const weekDays = getWeekDays(toZonedDateTime('2025-10-13'), 1)
 * // Returns: [Mon Oct 13, Tue Oct 14, ..., Sun Oct 19]
 *
 * @example
 * // Get week starting from Wednesday when current date is Monday
 * const weekDays = getWeekDays(toZonedDateTime('2025-10-13'), 3)
 * // Returns: [Wed Oct 8, Thu Oct 9, ..., Tue Oct 14] (includes Monday Oct 13)
 */
export const getWeekDays = (
  currentDate: Temporal.ZonedDateTime,
  firstDayOfWeek: number
): Temporal.ZonedDateTime[] => {
  const startOfWeekFromCurrentDate = startOf(currentDate, "week").add({
    days: firstDayOfWeek,
  });

  const adjustedStartOfWeek = isBefore(currentDate, startOfWeekFromCurrentDate)
    ? startOfWeekFromCurrentDate.subtract({ weeks: 1 })
    : startOfWeekFromCurrentDate;

  return Array.from({ length: 7 }, (_, dayIndex) =>
    adjustedStartOfWeek.add({ days: dayIndex })
  );
};

/**
 * Generates 6 weeks of days for a month calendar view.
 * Always returns 42 days (6 weeks × 7 days).
 */
export const getMonthWeeks = (
  monthDate: Temporal.ZonedDateTime,
  firstDayOfWeek: number
): Temporal.ZonedDateTime[][] => {
  const monthStart = startOf(monthDate, "month");
  const firstWeek = getWeekDays(monthStart, firstDayOfWeek);
  const firstDayOfGrid = firstWeek.at(0) ?? monthStart;

  return Array.from({ length: 6 }, (_, weekIndex) => {
    const weekStart = firstDayOfGrid.add({ weeks: weekIndex });

    return getWeekDays(weekStart, firstDayOfWeek);
  });
};

export const getMonthDays = (
  monthDate: Temporal.ZonedDateTime
): Temporal.ZonedDateTime[] => {
  const { daysInMonth } = monthDate;
  const startOfMonth = startOf(monthDate, "month");

  return Array.from({ length: daysInMonth }, (_, i) =>
    startOfMonth.add({ days: i })
  );
};

interface GetDayHoursOptions {
  length?: number;
  referenceDate?: Temporal.ZonedDateTime;
}

/**
 * Generates an array of 24 ZonedDateTimes representing hourly slots for a day.
 * Uses .hour(i) so each row maps to "the hour labeled i" — keeping grid rows
 * aligned across columns in week views. On DST spring-forward, .hour(2) returns
 * 3 AM (the non-existent hour is collapsed), but the grid key fix (dayIndex)
 * and per-day generation in views handle this correctly.
 */
export const getDayHours = ({
  referenceDate = now(),
  length = 24,
}: GetDayHoursOptions = {}): Temporal.ZonedDateTime[] => {
  const startOfDay = startOf(referenceDate, "day");

  return Array.from({ length }, (_, i) =>
    startOfDay.with({
      hour: i,
      microsecond: 0,
      millisecond: 0,
      minute: 0,
      nanosecond: 0,
      second: 0,
    })
  );
};

/** The 6x7 month grid range: first cell of week 1 → last cell of week 6. */
export const getMonthGridRange = (
  date: Temporal.ZonedDateTime,
  firstDayOfWeek: number
) => {
  const weeks = getMonthWeeks(date, firstDayOfWeek);
  const gridStart = weeks.at(0)?.at(0) ?? date;
  const gridEnd = weeks.at(-1)?.at(-1) ?? date;

  return { end: endOf(gridEnd, "day"), start: startOf(gridStart, "day") };
};
