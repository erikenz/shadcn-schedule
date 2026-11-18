import type { Temporal } from "temporal-polyfill";

import type { CalendarEvent } from "@/types/index";
import {
  isAfter,
  isBefore,
  isSameOrAfter,
  isSameOrBefore,
} from "@/utils/temporal";

/**
 * Membership rule for the resource axis: when `resourceIds` is present,
 * `resourceId` is ignored unless listed. A cross-resource event renders once
 * per matching resource (no spanning rendering exists).
 */
export const getEventResourceIds = (
  event: CalendarEvent
): (string | number)[] => {
  if (event.resourceIds) {
    return event.resourceIds;
  }

  if (event.resourceId !== undefined) {
    return [event.resourceId];
  }

  return [];
};

/** Resource-axis filter stage: keep events whose membership set contains resourceId. */
export const filterEventsForResource = <
  TEvent extends CalendarEvent = CalendarEvent,
>(
  events: TEvent[],
  resourceId: string | number
): TEvent[] =>
  events.filter((event) =>
    getEventResourceIds(event).some((id) => id === resourceId)
  );

/**
 * Whether an event's interval overlaps with the `[start, end]` range
 * (inclusive). Covers the three cases: starts inside the range, ends inside
 * the range, or fully spans the range.
 */
export const eventOverlapsRange = (
  event: CalendarEvent,
  start: Temporal.ZonedDateTime,
  end: Temporal.ZonedDateTime
): boolean => {
  const startsInRange =
    isSameOrAfter(event.start, start) && isSameOrBefore(event.start, end);

  const endsInRange =
    isSameOrAfter(event.end, start) && isSameOrBefore(event.end, end);

  const spansRange = isBefore(event.start, start) && isAfter(event.end, end);

  return startsInRange || endsInRange || spansRange;
};
