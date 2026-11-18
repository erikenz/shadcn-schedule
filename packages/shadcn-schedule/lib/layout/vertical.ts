import type { Temporal } from "temporal-polyfill";

import type { VerticalPositionedEvent } from "@/lib/layout/geometry";
import type { CalendarEvent } from "@/types/index";
import { diff, isSameOrAfter, maxDateTime, now } from "@/utils/temporal";

interface VerticalLayoutInput {
  days: Temporal.ZonedDateTime[];
  /**
   * Overlapping events: `false` (default) gives each event its own
   * non-overlapping column; `true` stacks them full-width on top of each
   * other (later events render above).
   */
  eventOverlap?: boolean;
  events: CalendarEvent[];
  gridType?: "day" | "hour" | "minute";
}

interface GridMetrics {
  gridStart: Temporal.ZonedDateTime;
  gridType: "day" | "hour" | "minute";
  isDiscrete: boolean;
  totalUnits: number;
}

// --- Phase 1: cluster -------------------------------------------------------

/** Groups time-sorted events into clusters of transitively overlapping events. */
const clusterOverlappingEvents = (
  sortedEvents: CalendarEvent[]
): CalendarEvent[][] => {
  const clusters: CalendarEvent[][] = [];
  let currentCluster: CalendarEvent[] = [];
  let lastEventEnd: Temporal.ZonedDateTime | null = null;

  for (const event of sortedEvents) {
    if (
      lastEventEnd &&
      (isSameOrAfter(event.start, lastEventEnd) ||
        diff(event.start, lastEventEnd, "millisecond") >= 0)
    ) {
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }

      currentCluster = [];
    }

    currentCluster.push(event);
    lastEventEnd = lastEventEnd
      ? maxDateTime(lastEventEnd, event.end)
      : event.end;
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  return clusters;
};

// --- Phase 2: geometry ------------------------------------------------------

/** Top/height percentages for an event, clamped to the grid; null if outside. */
const computeTopHeight = (
  event: CalendarEvent,
  { gridStart, totalUnits, gridType, isDiscrete }: GridMetrics
): { top: number; height: number } | null => {
  let startTime = diff(event.start, gridStart, gridType, true);
  let endTime = diff(event.end, gridStart, gridType, true);

  if (isDiscrete) {
    startTime = Math.floor(startTime);
    endTime = Math.ceil(endTime);

    if (endTime <= startTime) {
      endTime = startTime + 1;
    }
  }

  if (startTime < 0) {
    startTime = 0;
  }

  if (endTime > totalUnits) {
    endTime = totalUnits;
  }

  const duration = Math.max(0, endTime - startTime);

  if (duration === 0) {
    return null;
  }

  return {
    height: (duration / totalUnits) * 100,
    top: (startTime / totalUnits) * 100,
  };
};

// --- Phase 3: place ---------------------------------------------------------

/**
 * Orders a group's events longest-first with an earliest-start tiebreak (the
 * same ordering `placeCluster` uses for lone overlapping events).
 */
const byDurationDesc = (a: CalendarEvent, b: CalendarEvent): number => {
  const durDiff =
    diff(b.end, b.start, "minute") - diff(a.end, a.start, "minute");

  return durDiff === 0 ? diff(a.start, b.start) : durDiff;
};

/**
 * Splits a cluster into stack groups: events sharing a `stackGroup` land in
 * one group (they share a column); events without one are singletons.
 * Returns [groups, columnCount] where columnCount = number of groups.
 */
const groupCluster = (cluster: CalendarEvent[]) => {
  const groupsByKey = new Map<string, CalendarEvent[]>();

  for (const event of cluster) {
    const key = event.stackGroup ?? `__single-${String(event.id)}__`;
    const group = groupsByKey.get(key);

    if (group) {
      group.push(event);
    } else {
      groupsByKey.set(key, [event]);
    }
  }

  // Deterministic column order: groups sorted by their longest event's
  // duration (desc), then earliest start. Longest-first keeps a continuing
  // event in the same column across adjacent clusters.
  const groups = [...groupsByKey.values()].toSorted((a, b) => {
    const aAnchor = a.toSorted(byDurationDesc).at(0);
    const bAnchor = b.toSorted(byDurationDesc).at(0);

    if (!(aAnchor && bAnchor)) {
      return 0;
    }

    return byDurationDesc(aAnchor, bAnchor);
  });

  return { columnCount: groups.length, groups };
};

/**
 * Positions one cluster: a lone event spans full width; overlapping events
 * either share equal non-overlapping columns (default) or stack full-width.
 * With `stackGroup` set, a cluster's columns are assigned per group instead
 * of per event, so same-group events always share one column.
 */
const placeCluster = (
  cluster: CalendarEvent[],
  metrics: GridMetrics,
  eventOverlap: boolean
): VerticalPositionedEvent[] => {
  const onlyEvent = cluster.length === 1 ? cluster.at(0) : undefined;

  if (onlyEvent) {
    const pos = computeTopHeight(onlyEvent, metrics);

    if (!pos) {
      return [];
    }

    return [
      { event: onlyEvent, kind: "vertical", left: 0, width: 100, ...pos },
    ];
  }

  const { columnCount, groups } = groupCluster(cluster);
  const columnWidth = 100 / columnCount;
  const placed: VerticalPositionedEvent[] = [];
  // zIndex order = append order: within a column, later events render above
  // earlier ones (grouped events keep longest-first within their column).
  let zIndex = 1;

  // One event of a group: an unplaceable event is skipped, otherwise it lands
  // full-width (stacked) or in its shared column, and zIndex advances.
  const placeGroupEvent = (event: CalendarEvent, columnIndex: number) => {
    const pos = computeTopHeight(event, metrics);

    if (!pos) {
      return;
    }

    if (eventOverlap) {
      // Full-width stacking: later events render on top (higher zIndex).
      placed.push({
        event,
        kind: "vertical",
        ...pos,
        left: 0,
        width: 100,
        zIndex,
      });
      zIndex += 1;

      return;
    }

    placed.push({
      event,
      kind: "vertical",
      ...pos,
      left: columnWidth * columnIndex,
      width: columnWidth,
      zIndex,
    });
    zIndex += 1;
  };

  for (const [columnIndex, group] of groups.entries()) {
    // Longest duration first, tie-break by earliest start — keeps the column
    // order deterministic and later events rendering above earlier ones.
    const sortedGroup = group.toSorted(byDurationDesc);

    for (const event of sortedGroup) {
      placeGroupEvent(event, columnIndex);
    }
  }

  return placed;
};

// --- Entry point ------------------------------------------------------------

export const layoutVertical = ({
  days,
  gridType = "hour",
  events,
  eventOverlap = false,
}: VerticalLayoutInput): VerticalPositionedEvent[] => {
  // Filter out all-day events and sort by start time
  const sortedEvents = events
    .filter((e) => e.allDay !== true)
    .toSorted((a, b) => diff(a.start, b.start));

  if (sortedEvents.length === 0) {
    return [];
  }

  // Grid boundaries and metrics, anchored to the grid unit boundaries.
  const metrics: GridMetrics = {
    gridType,
    gridStart: days.at(0) ?? now(),
    isDiscrete: gridType === "day",
    totalUnits: days.length,
  };

  return clusterOverlappingEvents(sortedEvents).flatMap((cluster) =>
    placeCluster(cluster, metrics, eventOverlap)
  );
};
