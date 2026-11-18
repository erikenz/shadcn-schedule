import type { Temporal } from "temporal-polyfill";

import { hasText } from "@/lib/guards";
import type { RRuleOptions } from "@/plugins/recurrence/types";
import {
  findBaseEvent,
  getEventParentUID,
  getSeriesTerminationDate,
} from "@/plugins/recurrence/utils/series-helpers";
import type { CalendarEvent, PluginMutationResult } from "@/types/index";
import {
  diff,
  isAfter,
  startOf,
  toDate,
  toISOString,
  toZonedDateTime,
} from "@/utils/temporal";

/**
 * Keeps the calendar day from `target` while applying the time-of-day from `source`.
 * Used to edit recurring series anchors without shifting the series to an instance day.
 */
const withTimeOfDay = (
  target: Temporal.ZonedDateTime,
  source: Temporal.ZonedDateTime
): Temporal.ZonedDateTime => {
  const timeOfDayMs = diff(source, startOf(source, "day"), "millisecond");

  return startOf(target, "day").add({ milliseconds: timeOfDayMs });
};

/**
 * Builds the new base series produced by a "following" edit: a fresh series id/uid
 * anchored at the target (or submitted) start, carrying the submitted updates.
 */
const buildFollowingSeriesEvent = (
  baseEvent: CalendarEvent,
  targetEvent: CalendarEvent,
  updates: Partial<CalendarEvent>
): CalendarEvent => {
  const originalDuration = diff(baseEvent.end, baseEvent.start);
  const newSeriesStartTime = updates.start ?? targetEvent.start;

  const newSeriesEndTime =
    updates.end ?? newSeriesStartTime.add({ milliseconds: originalDuration });

  const newSeriesId = `${baseEvent.id}_following`;
  const newSeriesUID = `${newSeriesId}@calendar.local`;
  const baseRule = baseEvent.rrule;

  if (!baseRule) {
    throw new Error("Base recurring event has no rrule");
  }

  const newSeries: CalendarEvent = {
    ...baseEvent,
    ...updates,
    end: newSeriesEndTime,
    id: newSeriesId,
    rrule: {
      ...baseRule,
      ...(updates.rrule ?? baseRule),
      dtstart: toDate(newSeriesStartTime),
    },
    start: newSeriesStartTime,
    uid: newSeriesUID,
  };

  // The new series is a base row of its own, not an override of the old one.
  delete newSeries.recurrenceId;

  return newSeries;
};

/**
 * Predicate factory for the "following" edit: a detached override of the same
 * series whose occurrence falls strictly after the split belongs to the new
 * series' span and must be cascaded out, not orphaned in the store.
 */
const makeIsFollowingOverride =
  (
    parentUid: string,
    terminationDate: Date
  ): ((event: CalendarEvent) => boolean) =>
  (event: CalendarEvent): boolean => {
    const { recurrenceId } = event;
    const isDetachedOverride = Boolean(recurrenceId) && !event.rrule;
    const belongsToSeries = getEventParentUID(event) === parentUid;

    const isAfterSplit = hasText(recurrenceId)
      ? isAfter(toZonedDateTime(recurrenceId), toZonedDateTime(terminationDate))
      : false;

    return isDetachedOverride && belongsToSeries && isAfterSplit;
  };

/**
 * For scope "all": apply the submitted wall-clock time to the base event anchor.
 * This keeps the series anchored to its original date while changing its time.
 */
const applyAllScopeUpdates = (
  baseEvent: CalendarEvent,
  updates: Partial<CalendarEvent>
) => {
  let newStart = baseEvent.start;

  // if the start has changed keep the same calendar day but with the new time
  if (updates.start) {
    newStart = withTimeOfDay(baseEvent.start, updates.start);
  }

  let newEnd = baseEvent.end;

  // ensure the new end is compute so the duration is preserved
  if (updates.start && updates.end) {
    newEnd = newStart.add({ milliseconds: diff(updates.end, updates.start) });
  } else if (updates.start) {
    newEnd = newStart.add({
      milliseconds: diff(baseEvent.end, baseEvent.start),
    });
  } else if (updates.end) {
    newEnd = withTimeOfDay(baseEvent.end, updates.end);
  }

  const mergedRrule = updates.rrule ?? baseEvent.rrule;
  let newRrule: RRuleOptions | undefined;

  if (mergedRrule) {
    newRrule = { ...mergedRrule, dtstart: toDate(newStart) };
  }

  return { end: newEnd, rrule: newRrule, start: newStart };
};

interface UpdateRecurringEventProps {
  currentEvents: CalendarEvent[];
  scope: "this" | "following" | "all";
  targetEvent: CalendarEvent;
  updates: Partial<CalendarEvent>;
}

interface ScopedUpdateContext {
  baseEvent: CalendarEvent;
  baseEventIndex: number;
  targetEvent: CalendarEvent;
  updatedEvents: CalendarEvent[];
  updates: Partial<CalendarEvent>;
}

/**
 * The EXDATE key for a "this"-scope edit: a stored override keys by its original
 * occurrence (`recurrenceId`); a generated instance keys by its own start.
 */
const getThisScopeRecurrenceId = (
  targetEvent: CalendarEvent,
  isOverrideEvent: boolean
): string => {
  if (isOverrideEvent && hasText(targetEvent.recurrenceId)) {
    return targetEvent.recurrenceId;
  }

  return toISOString(targetEvent.start);
};

interface ReplaceStoredOverrideArgs {
  baseChanged: boolean;
  detachedOverride: CalendarEvent;
  targetEvent: CalendarEvent;
  updatedBaseEvent: CalendarEvent;
  updatedEvents: CalendarEvent[];
}

/**
 * Replaces a stored override in place. The base is reported in `updated` only when
 * it actually changed — a consistent store already exdates the occurrence and
 * carries the uid, so reporting it would fire a redundant no-op onEventUpdate.
 */

const replaceStoredOverride = ({
  updatedEvents,
  targetEvent,
  detachedOverride,
  updatedBaseEvent,
  baseChanged,
}: ReplaceStoredOverrideArgs): PluginMutationResult => {
  const overrideIndex = updatedEvents.findIndex((e) => e.id === targetEvent.id);

  if (overrideIndex === -1) {
    throw new Error("Detached override not found");
  }

  updatedEvents[overrideIndex] = detachedOverride;

  return {
    added: [],
    deleted: [],
    events: updatedEvents,
    updated: baseChanged
      ? [updatedBaseEvent, detachedOverride]
      : [detachedOverride],
  };
};

/**
 * Scope "this": EXDATE on base + a detached override for this occurrence.
 * A generated instance adds a new override row; a stored override updates in place.
 */
const updateThisScope = ({
  targetEvent,
  updates,
  updatedEvents,
  baseEventIndex,
  baseEvent,
}: ScopedUpdateContext): PluginMutationResult => {
  const seriesUid = getEventParentUID(baseEvent);

  const isOverrideEvent =
    hasText(targetEvent.recurrenceId) && !targetEvent.rrule;

  const recurrenceId = getThisScopeRecurrenceId(targetEvent, isOverrideEvent);

  const existingExdates = baseEvent.exdates ?? [];

  const nextExdates = existingExdates.includes(recurrenceId)
    ? existingExdates
    : [...existingExdates, recurrenceId];

  const baseChanged =
    nextExdates !== existingExdates || baseEvent.uid !== seriesUid;

  const updatedBaseEvent: CalendarEvent = {
    ...baseEvent,
    exdates: nextExdates,
    uid: seriesUid,
  };

  updatedEvents[baseEventIndex] = updatedBaseEvent;

  const detachedOverride: CalendarEvent = {
    ...targetEvent,
    ...updates,
    recurrenceId,
    uid: seriesUid,
  };

  // A detached override stands on its own, so it carries no rule.
  delete detachedOverride.rrule;

  if (isOverrideEvent) {
    return replaceStoredOverride({
      baseChanged,
      detachedOverride,
      targetEvent,
      updatedBaseEvent,
      updatedEvents,
    });
  }

  const modifiedEvent: CalendarEvent = {
    ...detachedOverride,
    id: `${baseEvent.id}_modified_${Date.now()}`,
  };

  updatedEvents.push(modifiedEvent);

  return {
    added: [modifiedEvent],
    deleted: [],
    events: updatedEvents,
    updated: [updatedBaseEvent],
  };
};

/**
 * Scope "following": terminate the original series with UNTIL before the target
 * date and create a new series from the target. Detached overrides of the series
 * whose occurrence falls after the split are cascaded out (reported in `deleted`).
 */
const updateFollowingScope = ({
  targetEvent,
  updates,
  updatedEvents,
  baseEventIndex,
  baseEvent,
}: ScopedUpdateContext): PluginMutationResult => {
  const terminationDate = getSeriesTerminationDate(targetEvent);
  const parentUid = getEventParentUID(baseEvent);

  const isFollowingOverride = makeIsFollowingOverride(
    parentUid,
    terminationDate
  );

  // Update original series with UNTIL to end before target date. Drop the
  // exdates that now sit beyond UNTIL (the cascaded overrides' occurrences).
  const cleanedExdates = (baseEvent.exdates ?? []).filter(
    (iso) => !isAfter(toZonedDateTime(iso), toZonedDateTime(terminationDate))
  );

  const baseRule = baseEvent.rrule;

  if (!baseRule) {
    throw new Error("Base recurring event has no rrule");
  }

  const terminatedEvent = {
    ...baseEvent,
    exdates: cleanedExdates,
    rrule: {
      ...baseRule,
      until: terminationDate,
    },
  };

  updatedEvents[baseEventIndex] = terminatedEvent;

  const newSeriesEvent = buildFollowingSeriesEvent(
    baseEvent,
    targetEvent,
    updates
  );

  updatedEvents.push(newSeriesEvent);

  // The new series carries an rrule, so it is never matched as a following
  // override; filter after the push so only the orphaned overrides drop out.
  const followingOverrides = updatedEvents.filter(isFollowingOverride);
  const events = updatedEvents.filter((e) => !isFollowingOverride(e));

  return {
    events,
    added: [newSeriesEvent],
    deleted: followingOverrides,
    updated: [terminatedEvent],
  };
};

/**
 * Scope "all": reset the base recurring event (Google-Calendar behavior). Anchor
 * dates change but the series day is kept; detached overrides are dropped and
 * exceptions cleared, so previously split/deleted occurrences return.
 */
const updateAllScope = ({
  updates,
  updatedEvents,
  baseEventIndex,
  baseEvent,
}: ScopedUpdateContext): PluginMutationResult => {
  const seriesUid = getEventParentUID(baseEvent);
  const anchored = applyAllScopeUpdates(baseEvent, updates);

  const updatedBaseEvent: CalendarEvent = {
    ...baseEvent,
    ...updates,
    end: anchored.end,
    rrule: anchored.rrule,
    start: anchored.start,
    uid: seriesUid,
  };

  // Dropping exdates re-opens every occurrence of the series.
  delete updatedBaseEvent.exdates;
  updatedEvents[baseEventIndex] = updatedBaseEvent;

  const isDetachedOverrideOfSeries = (e: CalendarEvent): boolean => {
    const isDetachedOverride = Boolean(e.recurrenceId) && !e.rrule;
    const belongsToSeries = getEventParentUID(e) === seriesUid;

    return isDetachedOverride && belongsToSeries;
  };

  const events = updatedEvents.filter((e) => !isDetachedOverrideOfSeries(e));
  const deletedOverrides = updatedEvents.filter(isDetachedOverrideOfSeries);

  return {
    events,
    added: [],
    deleted: deletedOverrides,
    updated: [updatedBaseEvent],
  };
};

const scopedUpdateHandlers: Record<
  UpdateRecurringEventProps["scope"],
  (context: ScopedUpdateContext) => PluginMutationResult
> = {
  all: updateAllScope,
  following: updateFollowingScope,
  this: updateThisScope,
};

export const updateRecurringEvent = ({
  targetEvent,
  updates,
  currentEvents,
  scope,
}: UpdateRecurringEventProps): PluginMutationResult => {
  const updatedEvents = [...currentEvents];

  const { baseEvent, baseEventIndex } = findBaseEvent(
    updatedEvents,
    targetEvent
  );

  const handler = scopedUpdateHandlers[scope];

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
    updates,
  });
};
