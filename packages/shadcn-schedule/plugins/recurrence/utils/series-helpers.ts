import { hasRef, hasText, textOr } from "@/lib/guards";
import type { CalendarEvent } from "@/types/index";
import { endOf, toDate, toISOString } from "@/utils/temporal";

export const isRecurringEvent = (event: CalendarEvent): boolean =>
  hasRef(event.rrule ?? event.recurrenceId) || hasRef(event.uid);

/**
 * Consistently derives a parent UID from an event.
 * Uses the explicit `uid` if available, otherwise falls back to `${id}@calendar.local`.
 */
export const getEventParentUID = (event: CalendarEvent): string =>
  textOr(event.uid, `${event.id}@calendar.local`);

/**
 * Finds the base recurring event (the one with rrule and no recurrenceId)
 * that shares the same parent UID as the target event, together with its index
 * in `events`.
 * Throws if not found — callers assume the series exists.
 */
export const findBaseEvent = (
  events: CalendarEvent[],
  targetEvent: CalendarEvent
) => {
  const targetUid = getEventParentUID(targetEvent);

  const baseEventIndex = events.findIndex((candidate) => {
    const belongsToSeries = getEventParentUID(candidate) === targetUid;
    const hasRrule = Boolean(candidate.rrule);
    const isBaseSeries = hasRrule && !hasText(candidate.recurrenceId);

    return belongsToSeries && isBaseSeries;
  });

  const baseEvent = events[baseEventIndex];

  if (baseEvent === undefined) {
    throw new Error("Base recurring event not found");
  }

  return { baseEvent, baseEventIndex };
};

/**
 * For the "following" scope: the UNTIL date that terminates the original
 * series is the end of the day BEFORE the target event's start. This keeps
 * the last pre-target occurrence in the terminated series.
 */
export const getSeriesTerminationDate = (targetEvent: CalendarEvent): Date =>
  toDate(endOf(targetEvent.start.subtract({ days: 1 }), "day"));

/**
 * RFC 5545 RECURRENCE-ID: for detached overrides, the original occurrence
 * start is stored on recurrenceId; generated instances use their start.
 */
export const getOccurrenceStartISO = (event: CalendarEvent): string =>
  event.recurrenceId ?? toISOString(event.start);

/**
 * Appends the target occurrence's start to the base event's EXDATE list,
 * excluding that single occurrence from the series. Shared by the "this" scope
 * of both edit and delete.
 */
export const addExdateToBaseEvent = (
  baseEvent: CalendarEvent,
  targetEvent: CalendarEvent
) => {
  const targetEventStartISO = getOccurrenceStartISO(targetEvent);
  const existingExdates = baseEvent.exdates ?? [];

  const updatedExdates = existingExdates.includes(targetEventStartISO)
    ? existingExdates
    : [...existingExdates, targetEventStartISO];

  return {
    baseEvent: { ...baseEvent, exdates: updatedExdates },
    targetEventStartISO,
  };
};
