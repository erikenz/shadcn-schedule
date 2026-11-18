import {
  addExdateToBaseEvent,
  findBaseEvent,
  getEventParentUID,
  getOccurrenceStartISO,
  getSeriesTerminationDate,
} from "@/plugins/recurrence/utils/series-helpers";
import type { CalendarEvent, PluginMutationResult } from "@/types/index";

interface DeleteRecurringEventProps {
  currentEvents: CalendarEvent[];
  scope: "this" | "following" | "all";
  targetEvent: CalendarEvent;
}

interface ScopedDeleteContext {
  baseEvent: CalendarEvent;
  baseEventIndex: number;
  targetEvent: CalendarEvent;
  updatedEvents: CalendarEvent[];
}

/**
 * Scope "this": EXDATE the occurrence on the base and drop any detached override
 * for it. Persistence callbacks are mutually exclusive — report `deleted` when a
 * stored override is removed, otherwise report `updated` with the new EXDATE.
 */
const deleteThisScope = ({
  targetEvent,
  updatedEvents,
  baseEventIndex,
  baseEvent,
}: ScopedDeleteContext): PluginMutationResult => {
  const occurrenceStartISO = getOccurrenceStartISO(targetEvent);
  const parentUid = getEventParentUID(baseEvent);

  const { baseEvent: updatedBaseEvent } = addExdateToBaseEvent(
    baseEvent,
    targetEvent
  );

  updatedEvents[baseEventIndex] = updatedBaseEvent;

  const isThisOccurrenceOverride = (e: CalendarEvent): boolean => {
    const isDetachedOverride = Boolean(e.recurrenceId);
    const belongsToSeries = getEventParentUID(e) === parentUid;
    const isThisOccurrence = e.recurrenceId === occurrenceStartISO;

    return isDetachedOverride && belongsToSeries && isThisOccurrence;
  };

  // Capture the dropped override before filtering so it can be reported as a
  // real stored deletion rather than silently vanishing from `events`.
  const droppedOverride = updatedEvents.find(isThisOccurrenceOverride);
  const events = updatedEvents.filter((e) => !isThisOccurrenceOverride(e));

  return {
    events,
    added: [],
    deleted: droppedOverride ? [droppedOverride] : [],
    updated: droppedOverride ? [] : [updatedBaseEvent],
  };
};

/**
 * Scope "following": terminate the series with UNTIL set before the target date,
 * keeping the last pre-target occurrence.
 */
const deleteFollowingScope = ({
  targetEvent,
  updatedEvents,
  baseEventIndex,
  baseEvent,
}: ScopedDeleteContext): PluginMutationResult => {
  const baseRule = baseEvent.rrule;

  if (!baseRule) {
    throw new Error("Base recurring event has no rrule");
  }

  const terminatedEvent = {
    ...baseEvent,
    rrule: {
      ...baseRule,
      until: getSeriesTerminationDate(targetEvent),
    },
  };

  updatedEvents[baseEventIndex] = terminatedEvent;

  return {
    added: [],
    deleted: [],
    events: updatedEvents,
    updated: [terminatedEvent],
  };
};

/**
 * Scope "all": remove the entire series (base + every detached override sharing
 * the parent uid), reporting all removed rows in `deleted`.
 */
const deleteAllScope = ({
  targetEvent,
  updatedEvents,
}: ScopedDeleteContext): PluginMutationResult => {
  const targetUid = getEventParentUID(targetEvent);

  const deletedSeries = updatedEvents.filter(
    (e) => getEventParentUID(e) === targetUid
  );

  const eventsWithoutTargetSeries = updatedEvents.filter(
    (e) => getEventParentUID(e) !== targetUid
  );

  return {
    added: [],
    deleted: deletedSeries,
    events: eventsWithoutTargetSeries,
    updated: [],
  };
};

const scopedDeleteHandlers: Record<
  DeleteRecurringEventProps["scope"],
  (context: ScopedDeleteContext) => PluginMutationResult
> = {
  all: deleteAllScope,
  following: deleteFollowingScope,
  this: deleteThisScope,
};

export const deleteRecurringEvent = ({
  targetEvent,
  currentEvents,
  scope,
}: DeleteRecurringEventProps): PluginMutationResult => {
  const updatedEvents = [...currentEvents];

  const { baseEvent, baseEventIndex } = findBaseEvent(
    updatedEvents,
    targetEvent
  );

  const handler = scopedDeleteHandlers[scope];

  if (handler === undefined) {
    throw new Error(
      `Invalid scope: ${scope}. Must be 'this', 'following', or 'all'`
    );
  }

  return handler({
    baseEvent,
    baseEventIndex,
    targetEvent,
    updatedEvents,
  });
};
