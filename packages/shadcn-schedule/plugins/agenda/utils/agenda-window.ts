/**
 * The date window the agenda lists (and that prev/next steps over).
 *
 * A named period is the calendar period *containing* the reference date, so it
 * can extend backward to the period's start (e.g. 'month' on the 14th lists from
 * the 1st) and stays aligned with the matching grid view and header label. A
 * number is a rolling window of that many days starting *at* the reference date
 * and counting forward (e.g. 8 on the 14th lists the 14th–21st) — there is no
 * calendar boundary to anchor it to, so it does not look backward.
 */
import type { Temporal } from "temporal-polyfill";

import { endOf, startOf, weekday } from "@/utils/temporal";

export type AgendaWindow = "day" | "week" | "month" | number;

type NamedWindow = Exclude<AgendaWindow, number>;

interface Range {
  end: Temporal.ZonedDateTime;
  start: Temporal.ZonedDateTime;
}

interface Step {
  amount: number;
  unit: "day" | "week" | "month";
}

const namedRange: Record<
  NamedWindow,
  (date: Temporal.ZonedDateTime, firstDayOfWeek: number) => Range
> = {
  day: (date) => ({ end: endOf(date, "day"), start: startOf(date, "day") }),
  month: (date) => ({
    end: endOf(date, "month"),
    start: startOf(date, "month"),
  }),
  week: (date, firstDayOfWeek) => {
    const offset = (weekday(date) - firstDayOfWeek + 7) % 7;
    const start = startOf(date.subtract({ days: offset }), "day");

    return { end: endOf(start.add({ days: 6 }), "day"), start };
  },
};

const namedStep: Record<NamedWindow, Step> = {
  day: { amount: 1, unit: "day" },
  month: { amount: 1, unit: "month" },
  week: { amount: 1, unit: "week" },
};

/** A number window is a rolling day count; the named windows are calendar periods. */
const isRollingWindow = (window: AgendaWindow): window is number =>
  typeof window === "number";

/**
 * The date window the agenda lists, derived from the reference date.
 * `firstDayOfWeek` aligns the 'week' window; ignored for other windows.
 */
export const windowRange = (
  date: Temporal.ZonedDateTime,
  window: AgendaWindow,
  firstDayOfWeek = 0
): Range => {
  if (isRollingWindow(window)) {
    return {
      end: endOf(date.add({ days: window - 1 }), "day"),
      start: startOf(date, "day"),
    };
  }

  return namedRange[window](date, firstDayOfWeek);
};

/** How far prev/next steps for the window. */
export const windowStep = (window: AgendaWindow): Step => {
  if (isRollingWindow(window)) {
    return { amount: window, unit: "day" };
  }

  return namedStep[window];
};
