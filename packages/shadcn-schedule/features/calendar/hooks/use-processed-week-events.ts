import { useMemo } from "react";
import type { Temporal } from "temporal-polyfill";

import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import {
  eventOverlapsRange,
  filterEventsForResource,
} from "@/lib/events/pipeline";
import { hasRef } from "@/lib/guards";
import type { HorizontalPositionedEvent } from "@/lib/layout/geometry";
import { layoutHorizontal } from "@/lib/layout/horizontal";
import { getDayKey } from "@/lib/utils/date-utils";
import type { CalendarEvent } from "@/types/index";
import { endOf, startOf } from "@/utils/temporal";

interface UseProcessedWeekEventsProps {
  allDay?: boolean;
  days: Temporal.ZonedDateTime[];
  gridType?: "day" | "hour";
  resourceId?: string | number;
}

interface ProcessedWeekEventsResult {
  dayEventsMap: Map<string, CalendarEvent[]>;
  positionedEvents: HorizontalPositionedEvent[];
}

export const useProcessedWeekEvents = ({
  days,
  allDay,
  resourceId,
  gridType,
}: UseProcessedWeekEventsProps): ProcessedWeekEventsResult => {
  const { dayMaxEvents, events: storeEvents } = useSmartCalendarContext(
    (c) => ({
      dayMaxEvents: c.dayMaxEvents,
      events: c.events,
    })
  );

  const first = days.at(0);
  const last = days.at(-1);
  const weekStart = first ? startOf(first, "day") : undefined;
  const weekEnd = last ? endOf(last, "day") : undefined;

  // Filter the store's pre-transformed events by this week's date range.
  // Using storeEvents directly (instead of the stable getEventsForDateRange
  // closure) so the memo invalidates when the store's events array changes.
  const events = useMemo(() => {
    if (!(weekStart && weekEnd)) {
      return [];
    }

    let weekEvents = storeEvents.filter((e) =>
      eventOverlapsRange(e, weekStart, weekEnd)
    );

    if (hasRef(resourceId)) {
      weekEvents = filterEventsForResource(weekEvents, resourceId);
    }

    if (allDay === true) {
      weekEvents = weekEvents.filter((e) => Boolean(e.allDay));
    }

    return weekEvents;
  }, [storeEvents, weekStart, weekEnd, resourceId, allDay]);

  const dayEventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const day of days) {
      const key = getDayKey(day);
      const dayStart = startOf(day, "day");
      const dayEnd = endOf(day, "day");

      const dayEvents = events.filter((e) =>
        eventOverlapsRange(e, dayStart, dayEnd)
      );

      map.set(key, dayEvents);
    }

    return map;
  }, [days, events]);

  const positionedEvents = useMemo(
    () =>
      layoutHorizontal({
        dayMaxEvents,
        days,
        events,
        gridType,
      }),
    [days, dayMaxEvents, events, gridType]
  );

  return { dayEventsMap, positionedEvents };
};
