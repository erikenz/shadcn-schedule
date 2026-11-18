import type { Temporal } from "temporal-polyfill";

import { hasNumber } from "@/lib/guards";
import type { CalendarEvent } from "@/types/index";
import {
  diff,
  endOf,
  isSame,
  startOf,
  toZonedDateTime,
} from "@/utils/temporal";

interface DropCellData {
  allDay?: boolean;
  date?: string | Temporal.ZonedDateTime;
  hour?: number;
  minute?: number;
  resourceId?: string | number;
  type?: string;
}

/**
 * The minimal drag-end shape this util reads (`active`/`over` truthiness and
 * the drop target's `data.current`). Both dnd-kit's `DragEndEvent` and the
 * test fixtures satisfy it structurally, so no assertion is needed.
 */
export interface DragEndEventLike {
  active: { id: string | number } | null;
  over: {
    data: { current: DropCellData | undefined };
    id: string | number;
  } | null;
}

export const getUpdatedEvent = (
  event: DragEndEventLike,
  activeEvent: CalendarEvent | null
) => {
  const { active, over } = event;

  if (!(active && over && activeEvent)) {
    return null;
  }

  const data = over.data.current ?? {};
  const isTimeCell = data.type === "time-cell" || hasNumber(data.hour);
  const { resourceId, allDay } = data;
  let newStart: Temporal.ZonedDateTime;

  if (isTimeCell) {
    const { date, hour = 0, minute = 0 } = data;

    // Create new start time based on the drop target
    newStart = toZonedDateTime(date).with({ hour, minute });
  } else {
    const { date } = data;

    newStart = toZonedDateTime(date);
  }

  const eventDuration = Math.trunc(
    diff(activeEvent.end, activeEvent.start, "second")
  );

  // Create new end time by adding the original duration
  let newEnd = newStart.add({ seconds: eventDuration });

  if (isSame(newEnd, startOf(newEnd, "day"))) {
    // If the new end time is at midnight, set it to 24 hours of partial day
    newEnd = endOf(newEnd.subtract({ days: 1 }), "day");
  }

  // Update the event with new times and resource if changed
  const updates = {
    resourceId,
    allDay: isTimeCell ? false : (allDay ?? activeEvent.allDay),
    end: newEnd,
    start: newStart,
  };

  return { activeEvent, updates };
};
