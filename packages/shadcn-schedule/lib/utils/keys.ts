import type { Temporal } from "temporal-polyfill";

import { getDayKey, isToday } from "@/lib/utils/date-utils";
import { format, toISOString } from "@/utils/temporal";

type Id = string | number;

const pad2 = (n: number | string): string => String(n).padStart(2, "0");

/** Hours arrive pre-formatted ('09') from `format`, or as plain numbers. */
const isNumberHour = (hour: number | string): hour is number =>
  typeof hour === "number";

const padHourIfNumber = (hour: number | string): string =>
  isNumberHour(hour) ? pad2(hour) : hour;

/**
 * Centralized factory for keys, ids, and data-testids. Each entry returns a
 * semantic string identified by its concept prefix (e.g. `day-col-`,
 * `day-cell-`, `week-header-day-`). The call site chooses the role — the
 * same string can serve as a React `key=`, an `id`, or a `data-testid`.
 *
 * Inspired by https://tkdodo.eu/blog/effective-react-query-keys#use-query-key-factories.
 * Prevents ad-hoc string concatenation so cross-cutting changes (prefix,
 * separator, format) are one-point.
 */
export const keys = {
  // Resource-scoped all-day row id (falls back to 'main' when unscoped).
  allDayRow: (resourceId?: Id) => `allday-row-${resourceId ?? "main"}`,

  // Grid cell identifiers
  cell: {
    day: (
      day: Temporal.ZonedDateTime,
      hour?: number | string,
      minute: number | string = 0
    ) => {
      const k = getDayKey(day);

      return hour === undefined
        ? `day-cell-${k}`
        : `day-cell-${k}-${pad2(hour)}-${pad2(minute)}`;
    },
    vertical: (
      day: Temporal.ZonedDateTime,
      hour: number | string,
      minute: number | string,
      resourceId?: Id
    ) => {
      const base = `vertical-cell-${getDayKey(day)}-${pad2(hour)}-${pad2(minute)}`;

      return resourceId === undefined ? base : `${base}-resource-${resourceId}`;
    },
    verticalTime: (hour: number | string) => `vertical-time-${pad2(hour)}`,
  },
  // Grid column configuration ids
  col: {
    allDay: (day: Temporal.ZonedDateTime, index: number) =>
      `all-day-col-${getDayKey(day)}-${index}`,
    date: "date-col",
    day: (day: Temporal.ZonedDateTime, resourceId?: Id) => {
      const base = `day-col-${getDayKey(day)}`;

      return resourceId === undefined ? base : `${base}-resource-${resourceId}`;
    },
    resource: (scope: "week" | "month", resourceId: Id) =>
      `${scope}-col-resource-${resourceId}`,
    time: "time-col",
  },

  // Container (wrapper) identifiers
  container: {
    eventsLayer: (orientation: "vertical" | "horizontal", id: Id) =>
      `${orientation}-events-${id}`,
    horizontal: {
      event: (eventId: Id) => `horizontal-event-${eventId}`,
      row: (id: Id) => `horizontal-row-${id}`,
      rowLabel: (resourceId: Id) => `horizontal-row-label-${resourceId}`,
    },
    vertical: {
      col: (id: Id) => `vertical-col-${id}`,
    },
  },

  // DayNumber component testid — `day-number-today` when the date is today,
  // otherwise `day-number-{D}`.
  dayNumber: (date: Temporal.ZonedDateTime) =>
    isToday(date) ? "day-number-today" : `day-number-${format(date, "D")}`,

  // Droppable ids (dnd-kit registry — ISO for per-slot uniqueness).
  // `drop-` prefix avoids colliding with `cell.day` testids.
  droppable: {
    dayCell: (
      day: Temporal.ZonedDateTime,
      options?: { allDay?: boolean; resourceId?: Id }
    ) => {
      const iso = toISOString(day);
      const allDayPart = options?.allDay === true ? "-allday" : "";

      const resourcePart =
        options?.resourceId === undefined
          ? ""
          : `-resource-${options.resourceId}`;

      return `drop-day-cell-${iso}${allDayPart}${resourcePart}`;
    },
  },

  // Header identifiers
  header: {
    resource: {
      // The vertical-arrangement resource header (day AND month views).
      columnsHeader: "resource-columns-header",
      monthDay: (day: Temporal.ZonedDateTime) =>
        `resource-month-header-${toISOString(day)}`,
      timeLabel: (view: "week" | "day", hour: number | string) =>
        `resource-${view}-time-label-${padHourIfNumber(hour)}`,
      weekDay: "resource-week-day-header",
    },
    week: {
      day: (day: Temporal.ZonedDateTime) =>
        `week-header-day-${toISOString(day)}`,
      hour: (day: Temporal.ZonedDateTime, ref: Id) =>
        `week-header-hour-${toISOString(day)}-${ref}`,
      resource: (resourceId: Id) => `week-header-resource-${resourceId}`,
    },
    weekday: (view: "week" | "month", name: string) =>
      `${view}-header-weekday-${name.toLowerCase()}`,
    year: {
      day: (monthKey: string, dayKey: string) =>
        `year-day-${monthKey}-${dayKey}`,
      month: (monthKey: string, part?: "title" | "count" | "mini") =>
        part ? `year-month-${part}-${monthKey}` : `year-month-${monthKey}`,
    },
  },

  // Generic iteration key composer for React `key=` props, list markers,
  // and suffixed wrapper keys (e.g. `listKey(base, 'animated')`).
  listKey: (...parts: (string | number)[]) => parts.join("-"),

  // Form element testid for time pickers (name = 'start' / 'end' etc.)
  timePicker: (name: string | undefined) => `time-picker-${name ?? ""}`,
} as const;
