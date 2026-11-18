import type { Temporal } from "temporal-polyfill";

import type { RRuleOptions } from "@/plugins/recurrence/types";
import {
  fromFloatingDate,
  toFloatingDate,
} from "@/plugins/recurrence/utils/floating-time";
import { getEventParentUID } from "@/plugins/recurrence/utils/series-helpers";
import {
  toFloatingDateFromZoned,
  toTemporalRule,
} from "@/plugins/recurrence/utils/temporal-rule";
import type { CalendarEvent } from "@/types/index";
import { safeDate } from "@/utils/helpers";
import {
  diff,
  isSame,
  isSameOrAfter,
  isSameOrBefore,
  toISOString,
  toZonedDateTime,
} from "@/utils/temporal";

interface GenerateRecurringEventsProps {
  currentEvents: CalendarEvent[];
  endDate: Temporal.ZonedDateTime;
  event: CalendarEvent;
  startDate: Temporal.ZonedDateTime;
}

/**
 * A generated instance of the parent event: the parent's fields with this
 * occurrence's start/end, its own id, the parent's uid (so the series groups),
 * and no RRULE (instances never carry one).
 */
const buildOccurrence = (
  event: CalendarEvent,
  start: Temporal.ZonedDateTime,
  index: number
): CalendarEvent => {
  const occurrence: CalendarEvent = {
    ...event,
    end: start.add({ milliseconds: diff(event.end, event.start) }),
    id: `${event.id}_${index}`,
    start,
    uid: getEventParentUID(event),
  };

  delete occurrence.rrule;

  return occurrence;
};

/**
 * Whether an occurrence is kept: not EXDATE-excluded, and spanning the
 * requested range (`start <= endDate` and `end >= startDate`, boundaries
 * included).
 */
const isKeptOccurrence = (
  occurrence: CalendarEvent,
  excludedStarts: Set<string>,
  startDate: Temporal.ZonedDateTime,
  endDate: Temporal.ZonedDateTime
): boolean =>
  !excludedStarts.has(toISOString(occurrence.start)) &&
  isSameOrBefore(occurrence.start, endDate) &&
  isSameOrAfter(occurrence.end, startDate);

export const generateRecurringEvents = ({
  event,
  currentEvents,
  startDate,
  endDate,
}: GenerateRecurringEventsProps): CalendarEvent[] => {
  // If not a recurring event, return empty array
  if (!event.rrule) {
    return [];
  }

  try {
    // DTSTART and SEARCH WINDOW TRANSFORMATION
    // Transform all dates to "floating time" (UTC with local components)
    // This ensures RRule evaluates "Wednesday" as the user's local Wednesday
    const floatingStart = toFloatingDate(event.start);
    let floatingUntil: Date | undefined;

    if (event.rrule.until) {
      floatingUntil = toFloatingDate(toZonedDateTime(event.rrule.until));
    }

    const ruleOptions: RRuleOptions = {
      ...event.rrule,
      dtstart: floatingStart,
      until: floatingUntil,
    };

    const rule = toTemporalRule(ruleOptions);

    const parentUid = getEventParentUID(event);

    const overrides = currentEvents.filter((candidate) => {
      const isOverride = Boolean(candidate.recurrenceId);
      const belongsToSeries = getEventParentUID(candidate) === parentUid;

      return isOverride && belongsToSeries;
    });

    // EXDATE exclusions are the same for every generated occurrence.
    const excludedStarts = new Set(event.exdates);

    // Calculate event duration to expand search window for events that span the range
    const eventDuration = diff(event.end, event.start);

    // Expand search window backward by event duration to catch events that start before
    // the range but span into it
    const expandedStartDateTime = toFloatingDate(
      startDate.subtract({ milliseconds: eventDuration })
    );

    const endDateTime = toFloatingDate(endDate);

    // Get all occurrences in the expanded range
    const occurrences = rule
      .between(expandedStartDateTime, endDateTime, true)
      .map(toFloatingDateFromZoned);

    // Convert occurrences to CalendarEvent instances, keeping only the ones
    // that survive the EXDATE/range checks, in a single pass.
    return occurrences.flatMap((occurrence, index) => {
      const occurrenceDate = fromFloatingDate(occurrence, event.start);

      const existingOverride = overrides.find((e) => {
        const overrideDate = safeDate(e.recurrenceId);

        return overrideDate ? isSame(overrideDate, occurrenceDate) : false;
      });

      // If there's an override, use it
      const recurringEvent = existingOverride
        ? { ...event, ...existingOverride }
        : buildOccurrence(event, occurrenceDate, index);

      return isKeptOccurrence(
        recurringEvent,
        excludedStarts,
        startDate,
        endDate
      )
        ? [recurringEvent]
        : [];
    });
  } catch (error) {
    // Handle invalid RRULE options
    throw new Error(`Invalid RRULE options: ${JSON.stringify(event.rrule)}`, {
      cause: error,
    });
  }
};
