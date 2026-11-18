import type { Temporal } from "temporal-polyfill";

import type { HorizontalPositionedEvent } from "@/lib/layout/geometry";
import type { CalendarEvent } from "@/types/index";
import {
  diff,
  endOf,
  isAfter,
  isBefore,
  maxDateTime,
  minDateTime,
  startOf,
} from "@/utils/temporal";

interface HorizontalLayoutInput {
  dayMaxEvents: number;
  days: Temporal.ZonedDateTime[];
  events: CalendarEvent[];
  gridType?: "day" | "hour";
}

interface GridBounds {
  firstUnit: Temporal.ZonedDateTime;
  gridType: "day" | "hour";
  lastUnit: Temporal.ZonedDateTime;
  /**
   * Grid length in layout units: minutes for hour grids (so sub-hour events
   * position at minute precision), days for day grids.
   */
  unitCount: number;
}

/** Layout-unit difference: minutes for hour grids, whole days otherwise. */
const unitDiff = (
  a: Temporal.ZonedDateTime,
  b: Temporal.ZonedDateTime,
  gridType: "day" | "hour"
): number => diff(a, b, gridType === "hour" ? "minute" : "day");

/** Whether an event spans more than one layout unit. */
const isMultiUnit = (event: CalendarEvent, gridType: "day" | "hour"): boolean =>
  unitDiff(event.end, event.start, gridType) > 0;

// --- Phase 1: cluster (partition + sort) ------------------------------------

/** Splits events into multi-unit and single-unit groups, each placement-sorted. */
const partitionAndSortEvents = (
  events: CalendarEvent[],
  gridType: "day" | "hour"
) => {
  const multiUnitEvents = events.filter((e) => isMultiUnit(e, gridType));
  const singleUnitEvents = events.filter((e) => !isMultiUnit(e, gridType));

  // Multi-unit: by start date, then longer events first.
  const sortedMultiUnit = multiUnitEvents.toSorted((a, b) => {
    const startDiff = diff(a.start, b.start);

    if (startDiff !== 0) {
      return startDiff;
    }

    return diff(b.end, b.start) - diff(a.end, a.start);
  });

  // Single-unit: by start time.
  const sortedSingleUnit = singleUnitEvents.toSorted((a, b) =>
    diff(a.start, b.start)
  );

  return { sortedMultiUnit, sortedSingleUnit };
};

// --- Phase 2: geometry ------------------------------------------------------

interface ColumnSpan {
  endCol: number;
  isTruncatedEnd: boolean;
  isTruncatedStart: boolean;
  startCol: number;
}

/**
 * Column span and truncation of an event, clamped to the grid bounds.
 * Hour grids anchor to the event's exact times (minute units); day grids
 * snap to whole days. Returns null when the event's visible part lies
 * entirely before the grid start (e.g. an overnight booking whose
 * after-midnight tail precedes the day's business hours).
 */
const computeColumnSpan = (
  event: CalendarEvent,
  { firstUnit, lastUnit, unitCount, gridType }: GridBounds
): ColumnSpan | null => {
  const isHourGrid = gridType === "hour";
  const startAnchor = isHourGrid ? event.start : startOf(event.start, gridType);
  const eventStart = maxDateTime(startAnchor, firstUnit);

  // Exclusive-ish end: hour grids mark the last occupied minute as
  // end - 1min (back-to-back bookings share no column); day grids clamp to
  // the last whole day.
  const adjustedEnd = isHourGrid
    ? event.end.subtract({ minutes: 1 })
    : event.end;

  const eventEnd = minDateTime(
    isHourGrid ? adjustedEnd : startOf(adjustedEnd, gridType),
    lastUnit
  );

  const startCol = Math.max(0, unitDiff(eventStart, firstUnit, gridType));

  const endCol = Math.min(
    unitCount - 1,
    unitDiff(eventEnd, firstUnit, gridType)
  );

  if (endCol < startCol) {
    return null;
  }

  return {
    endCol,
    startCol,
    isTruncatedEnd: isHourGrid
      ? isAfter(event.end, lastUnit)
      : isAfter(startOf(event.end, gridType), lastUnit),
    isTruncatedStart: isHourGrid
      ? isBefore(event.start, firstUnit)
      : isBefore(startOf(event.start, gridType), firstUnit),
  };
};

// --- Phase 3: place (occupancy grid) ----------------------------------------

type OccupancyGrid = boolean[][];

/** First row where every column from startCol..endCol is free; -1 if none. */
const findAvailableRow = (
  grid: OccupancyGrid,
  startCol: number,
  endCol: number
): number => {
  for (const [row, cells] of grid.entries()) {
    let canPlace = true;

    for (let col = startCol; col <= endCol; col += 1) {
      if (cells[col] === true) {
        canPlace = false;
        break;
      }
    }

    if (canPlace) {
      return row;
    }
  }

  return -1;
};

interface PlaceArgs {
  endCol: number;
  event: CalendarEvent;
  isTruncatedEnd: boolean;
  isTruncatedStart: boolean;
  row: number;
  startCol: number;
}

export const layoutHorizontal = ({
  days,
  events,
  dayMaxEvents,
  gridType = "day",
}: HorizontalLayoutInput): HorizontalPositionedEvent[] => {
  // For hour-based grids, use actual first/last hours from the days array;
  // for day-based grids, use start/end of day to capture all events.
  const first = days.at(0);
  const last = days.at(-1);

  if (!(first && last)) {
    return [];
  }

  const bounds: GridBounds = {
    gridType,
    firstUnit:
      gridType === "hour" ? startOf(first, "hour") : startOf(first, "day"),
    lastUnit: gridType === "hour" ? endOf(last, "hour") : endOf(last, "day"),
    unitCount: gridType === "hour" ? days.length * 60 : days.length,
  };

  const { sortedMultiUnit, sortedSingleUnit } = partitionAndSortEvents(
    events,
    gridType
  );

  // dayMaxEvents x unitCount occupancy grid.
  const grid: OccupancyGrid = Array.from({ length: dayMaxEvents }, () =>
    Array.from({ length: bounds.unitCount }, () => false)
  );

  const placedEvents: HorizontalPositionedEvent[] = [];

  const place = ({
    row,
    startCol,
    endCol,
    event,
    isTruncatedStart,
    isTruncatedEnd,
  }: PlaceArgs) => {
    const rowCells = grid[row];

    if (rowCells === undefined) {
      return;
    }

    for (let col = startCol; col <= endCol; col += 1) {
      rowCells[col] = true;
    }

    const spanUnits = endCol - startCol + 1;
    placedEvents.push({
      event,
      isTruncatedEnd,
      isTruncatedStart,
      row,
      kind: "horizontal",
      left: (startCol / bounds.unitCount) * 100,
      width: (spanUnits / bounds.unitCount) * 100,
    });
  };

  // Multi-unit events claim rows first.
  const placeMultiUnitEvent = (event: CalendarEvent) => {
    const span = computeColumnSpan(event, bounds);

    if (!span) {
      return;
    }

    // First try: place from the original start position.
    const row = findAvailableRow(grid, span.startCol, span.endCol);

    if (row !== -1) {
      place({ event, row, ...span });

      return;
    }

    // Fallback: try truncated versions starting from later units.
    for (
      let tryStart = span.startCol + 1;
      tryStart <= span.endCol;
      tryStart += 1
    ) {
      const truncRow = findAvailableRow(grid, tryStart, span.endCol);

      if (truncRow !== -1) {
        place({
          event,
          endCol: span.endCol,
          isTruncatedEnd: span.isTruncatedEnd,
          isTruncatedStart: true,
          row: truncRow,
          startCol: tryStart,
        });

        return;
      }
    }
  };

  for (const event of sortedMultiUnit) {
    placeMultiUnitEvent(event);
  }

  // Single-unit events fill the remaining gaps. computeColumnSpan already
  // clamps the span to the grid, so startCol needs no re-clamping here.
  for (const event of sortedSingleUnit) {
    const span = computeColumnSpan(event, bounds);

    if (!span) {
      continue;
    }

    const col = span.startCol;
    const row = findAvailableRow(grid, col, col);

    if (row !== -1) {
      place({
        event,
        row,
        endCol: col,
        isTruncatedEnd: false,
        isTruncatedStart: false,
        startCol: col,
      });
    }
  }

  return placedEvents;
};
