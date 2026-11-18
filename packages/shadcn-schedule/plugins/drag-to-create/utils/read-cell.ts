/**
 * A grid cell's identity, read from the self-describing data attributes that
 * `DroppableCell` emits (`data-start`/`data-end`/`data-resource-id`/`data-all-day`).
 */

import { Temporal } from "temporal-polyfill";

import { hasText } from "@/lib/guards";
import { getDefaultTimeZone, toZonedDateTime } from "@/utils/temporal";

export interface RawCell {
  allDay: boolean;
  /** The cell element itself (for geometry / mirror positioning). */
  element: HTMLElement;
  end: Temporal.ZonedDateTime;
  resourceId?: string;
  start: Temporal.ZonedDateTime;
}

/**
 * Find the grid cell at or above `el` and read its range/identity. Returns null
 * when `el` is not inside a cell (e.g. pointer over an event or empty gutter), or
 * the cell is disabled.
 *
 * `data-start`/`data-end` are UTC ISO strings (the cell emits `toISOString()`).
 * They MUST be parsed as instants: a `Z`-suffixed string read by its literal
 * wall-clock would yield 03:00, not the 00:00 the instant represents.
 * `toZonedDateTime(iso)` parses the instant and renders it in calendar-local
 * time.
 *
 * Reconstructing in the calendar timezone matters both for a correct
 * `openEventForm` payload AND so the same-day clamp in `isSameRegion` compares
 * calendar days, not UTC days (a 23:59 cell would otherwise read as the next
 * UTC day). With no `timezone` (regular calendar) we render in the local zone.
 */
export const readCell = (
  el?: Element | null,
  timezone?: string
): RawCell | null => {
  const cell = el?.closest<HTMLElement>("[data-start]");

  if (!cell) {
    return null;
  }

  if (cell.dataset.disabled === "true") {
    return null;
  }

  const { end, start } = cell.dataset;

  if (!(hasText(start) && hasText(end))) {
    return null;
  }

  const cellTimezone = cell.dataset.timezone ?? timezone;

  const toCalendarTime = (iso: string): Temporal.ZonedDateTime => {
    if (iso.includes("[")) {
      const parsed = Temporal.ZonedDateTime.from(iso);

      return hasText(cellTimezone) ? parsed.withTimeZone(cellTimezone) : parsed;
    }

    return toZonedDateTime(iso, cellTimezone ?? getDefaultTimeZone());
  };

  return {
    allDay: cell.dataset.allDay === "true",
    element: cell,
    end: toCalendarTime(end),
    resourceId: cell.dataset.resourceId,
    start: toCalendarTime(start),
  };
};
