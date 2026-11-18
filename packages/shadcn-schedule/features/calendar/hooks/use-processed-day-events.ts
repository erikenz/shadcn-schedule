import { useMemo } from "react";
import type { Temporal } from "temporal-polyfill";

import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import {
  eventOverlapsRange,
  filterEventsForResource,
} from "@/lib/events/pipeline";
import { hasRef } from "@/lib/guards";
import type { VerticalPositionedEvent } from "@/lib/layout/geometry";
import { layoutVertical } from "@/lib/layout/vertical";
import { endOf, startOf } from "@/utils/temporal";

interface UseProcessedDayEventsProps {
  // The specific day this column represents
  days: Temporal.ZonedDateTime[];
  gridType?: "day" | "hour";
  resourceId?: string | number;
}

export const useProcessedDayEvents = ({
  days,
  gridType,
  resourceId,
}: UseProcessedDayEventsProps) => {
  const { eventOverlap, events: storeEvents } = useSmartCalendarContext(
    (c) => ({
      eventOverlap: c.eventOverlap,
      events: c.events,
    })
  );

  const first = days.at(0);
  const last = days.at(-1);
  const dayStart = first ? startOf(first, "day") : undefined;
  const dayEnd = last ? endOf(last, "day") : undefined;

  // Filter the store's pre-transformed events by this column's date range.
  // Using storeEvents directly (instead of the stable getEventsForDateRange
  // closure) so the memo invalidates when the store's events array changes.
  const events = useMemo(() => {
    if (!(dayStart && dayEnd)) {
      return [];
    }

    let dayEvents = storeEvents.filter((e) =>
      eventOverlapsRange(e, dayStart, dayEnd)
    );

    if (hasRef(resourceId)) {
      dayEvents = filterEventsForResource(dayEvents, resourceId);
    }

    // Vertical grids (Day/Week/Resource Vertical) never render all-day events
    // as those are handled by the all-day-row or are not appropriate for the time grid.
    return dayEvents.filter((e) => e.allDay !== true);
  }, [dayStart, dayEnd, storeEvents, resourceId]);

  return useMemo<VerticalPositionedEvent[]>(
    () =>
      layoutVertical({
        days,
        eventOverlap,
        events,
        gridType,
      }),
    [days, eventOverlap, gridType, events]
  );
};
