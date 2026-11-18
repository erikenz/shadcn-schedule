import type { Temporal } from "temporal-polyfill";

import { hasText } from "@/lib/guards";
import { toRRuleLine } from "@/plugins/recurrence/utils/temporal-rule";
import type { CalendarEvent } from "@/types/index";
import { format, toZonedDateTime } from "@/utils/temporal";

const formatDate = (date: Temporal.ZonedDateTime, isAllDay = false): string => {
  if (isAllDay) {
    return format(date, "YYYYMMDD");
  }

  return format(date.withTimeZone("UTC"), "YYYYMMDD[T]HHmmss[Z]");
};

/**
 * Returns the recurrence-specific VEVENT property lines for an event: an
 * `RRULE:` line when the event has an rrule, an `EXDATE:` line when it has
 * exdates, and a `RECURRENCE-ID:` line when it is a modified instance.
 */
export const recurrenceICalProperties = (event: CalendarEvent): string[] => {
  const lines: string[] = [];

  const rruleLine = event.rrule ? toRRuleLine(event.rrule) : "";

  if (rruleLine) {
    lines.push(rruleLine);
  }

  if (
    event.exdates?.length !== undefined &&
    event.exdates?.length !== 0 &&
    !Number.isNaN(event.exdates?.length)
  ) {
    const exdates = event.exdates
      .map((date) => formatDate(toZonedDateTime(date), event.allDay))
      .join(",");

    lines.push(`EXDATE:${exdates}`);
  }

  if (hasText(event.recurrenceId)) {
    const recurrenceId = formatDate(
      toZonedDateTime(event.recurrenceId),
      event.allDay
    );

    lines.push(`RECURRENCE-ID:${recurrenceId}`);
  }

  return lines;
};
