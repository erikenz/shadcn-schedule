import { describe, expect, it } from "vitest";

import { hasValue } from "@/lib/guards";
import { recurrencePlugin } from "@/plugins/recurrence/recurrence-plugin";
import { deleteRecurringEvent } from "@/plugins/recurrence/utils/delete-recurring-event";
import { generateRecurringEvents } from "@/plugins/recurrence/utils/generate-recurring-events";
import {
  FREQ,
  WEEKDAYS,
} from "@/plugins/recurrence/utils/recurrence-constants";
import { isRecurringEvent } from "@/plugins/recurrence/utils/series-helpers";
import { updateRecurringEvent } from "@/plugins/recurrence/utils/update-recurring-event";
import { elementAt } from "@/test-utils/element-at";
import type { CalendarEvent } from "@/types/index";
import {
  format,
  isSame,
  toDate,
  toISOString,
  toZonedDateTime,
} from "@/utils/temporal";

// Test helper to create a base recurring event
const createBaseRecurringEvent = (
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  end: toZonedDateTime("2025-01-06T10:00:00"),
  id: "recurring-1",
  rrule: {
    byweekday: [WEEKDAYS.MO],
    // Match event start time
    dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00")),
    freq: FREQ.WEEKLY,
    interval: 1,
  },
  start: toZonedDateTime("2025-01-06T09:00:00"),
  title: "Weekly Meeting",
  uid: "recurring-1@calendar.test",
  ...overrides,
});

// Test helper to create a target event instance
const createTargetEvent = (
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  end: toZonedDateTime("2025-01-20T10:00:00"),
  id: "recurring-1_2",
  start: toZonedDateTime("2025-01-20T09:00:00"),
  title: "Weekly Meeting",
  uid: "recurring-1@calendar.test",
  ...overrides,
});

// Compact factories for the scope-"all" reset tests (DAILY series + overrides),
// to reduce repeated boilerplate across these cases.
const makeDailySeries = (
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
  id: "daily-1",
  rrule: {
    dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00.000Z")),
    freq: FREQ.DAILY,
    interval: 1,
  },
  start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
  title: "Daily Standup",
  uid: "daily-1@calendar.test",
  ...overrides,
});

const makeOverride = (
  base: CalendarEvent,
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  ...base,
  recurrenceId: "2025-01-07T09:00:00.000Z",
  rrule: null,
  ...overrides,
});

// Returns the terminated series' UNTIL date, throwing when the series or its
// rule is gone, so tests can assert it without carrying expects out of it().
const terminatedUntil = (
  result: CalendarEvent[],
  baseId: CalendarEvent["id"]
): Date => {
  const terminatedEvent = result.find((e) => e.id === baseId);

  if (!terminatedEvent?.rrule?.until) {
    throw new Error("terminatedEvent.rrule.until missing");
  }

  return terminatedEvent.rrule.until;
};

describe(isRecurringEvent, () => {
  it("should identify events with rrule as recurring", () => {
    const event = createBaseRecurringEvent();
    expect(isRecurringEvent(event)).toBeTruthy();
  });

  it("should identify events with recurrenceId as recurring", () => {
    const event = createTargetEvent({
      recurrenceId: "2025-01-20T09:00:00.000Z",
    });

    expect(isRecurringEvent(event)).toBeTruthy();
  });

  it("should not identify regular events as recurring", () => {
    const event = {
      ...createBaseRecurringEvent(),
      recurrenceId: null,
      rrule: null,
      uid: null,
    };

    expect(isRecurringEvent(event)).toBeFalsy();
  });
});

describe(generateRecurringEvents, () => {
  it("should generate weekly recurring events correctly", () => {
    const baseEvent = createBaseRecurringEvent();
    const startDate = toZonedDateTime("2025-01-01");
    const endDate = toZonedDateTime("2025-01-31");

    const result = generateRecurringEvents({
      currentEvents: [],
      event: baseEvent,
      endDate,
      startDate,
    });

    // 4 Mondays in January 2025
    expect(result).toHaveLength(4);
    expect(format(elementAt(result, 0).start, "YYYY-MM-DD")).toBe("2025-01-06");
    expect(format(elementAt(result, 1).start, "YYYY-MM-DD")).toBe("2025-01-13");
    expect(format(elementAt(result, 2).start, "YYYY-MM-DD")).toBe("2025-01-20");
    expect(format(elementAt(result, 3).start, "YYYY-MM-DD")).toBe("2025-01-27");

    // Each instance should have unique ID and no rrule
    for (const [index, event] of result.entries()) {
      expect(event.id).toBe(`recurring-1_${index}`);
      expect(event.rrule).toBeUndefined();
      expect(event.uid).toBe("recurring-1@calendar.test");
    }
  });

  it("should exclude EXDATE events correctly", () => {
    const baseEvent = createBaseRecurringEvent({
      exdates: ["2025-01-13T09:00:00.000Z", "2025-01-27T09:00:00.000Z"],
    });

    const startDate = toZonedDateTime("2025-01-01");
    const endDate = toZonedDateTime("2025-01-31");

    const result = generateRecurringEvents({
      currentEvents: [],
      event: baseEvent,
      endDate,
      startDate,
    });

    // 4 Mondays - 2 excluded = 2
    expect(result).toHaveLength(2);
    expect(format(elementAt(result, 0).start, "YYYY-MM-DD")).toBe("2025-01-06");
    expect(format(elementAt(result, 1).start, "YYYY-MM-DD")).toBe("2025-01-20");
  });

  it("should handle overrides correctly", () => {
    const baseEvent = createBaseRecurringEvent();

    const overrideEvent: CalendarEvent = {
      ...createTargetEvent(),
      end: toZonedDateTime("2025-01-13T15:00:00"),
      recurrenceId: "2025-01-13T09:00:00.000Z",
      start: toZonedDateTime("2025-01-13T14:00:00"),
      title: "Modified Meeting",
    };

    const result = generateRecurringEvents({
      currentEvents: [overrideEvent],
      endDate: toZonedDateTime("2025-01-31"),
      event: baseEvent,
      startDate: toZonedDateTime("2025-01-01"),
    });

    expect(result).toHaveLength(4);

    // Find the overridden event
    const modifiedEvent = result.find((e) =>
      isSame(e.start, toZonedDateTime("2025-01-13T14:00:00"))
    );

    expect(modifiedEvent).toBeDefined();
    expect(modifiedEvent?.title).toBe("Modified Meeting");
  });

  it("should return empty array for non-recurring events", () => {
    const regularEvent = { ...createBaseRecurringEvent(), rrule: null };

    const result = generateRecurringEvents({
      currentEvents: [],
      endDate: toZonedDateTime("2025-01-31"),
      event: regularEvent,
      startDate: toZonedDateTime("2025-01-01"),
    });

    expect(result).toHaveLength(0);
  });
});

describe(updateRecurringEvent, () => {
  describe('scope: "this"', () => {
    it("should add EXDATE to base event when updating single occurrence", () => {
      const baseEvent = createBaseRecurringEvent();
      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent];

      const updates = {
        start: toZonedDateTime("2025-01-20T14:00:00"),
        title: "Modified Meeting",
      };

      const result = updateRecurringEvent({
        scope: "this",
        currentEvents,
        targetEvent,
        updates,
      }).events;

      // base event + modified standalone event
      expect(result).toHaveLength(2);

      // Base event should have EXDATE
      const updatedBaseEvent = result.find((e) => e.id === baseEvent.id);
      expect(updatedBaseEvent?.exdates).toHaveLength(1);
      expect(updatedBaseEvent?.exdates).toContain("2025-01-20T09:00:00.000Z");
    });

    it("should create standalone modified event when updating single occurrence", () => {
      const baseEvent = createBaseRecurringEvent();
      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent];

      const updates = {
        start: toZonedDateTime("2025-01-20T14:00:00"),
        title: "Modified Meeting",
      };

      const result = updateRecurringEvent({
        scope: "this",
        currentEvents,
        targetEvent,
        updates,
      }).events;

      const modifiedEvent = result.find((e) => e.id !== baseEvent.id);
      expect(modifiedEvent?.title).toBe("Modified Meeting");
      expect(modifiedEvent?.id).toContain("recurring-1_modified_");
      expect(modifiedEvent?.recurrenceId).toBe("2025-01-20T09:00:00.000Z");
      expect(modifiedEvent?.uid).toBe(baseEvent.uid);
      expect(modifiedEvent?.rrule).toBeUndefined();
    });

    it("should keep uid on scope this base row for onEventUpdate when base has no uid", () => {
      const baseEvent = createBaseRecurringEvent({ uid: null });
      // Generated instances carry the series uid (from base id) even when stored base omits uid
      const seriesUid = "recurring-1@calendar.local";

      const targetEvent = createTargetEvent({
        rrule: null,
        uid: seriesUid,
      });

      const { updated } = updateRecurringEvent({
        targetEvent,
        currentEvents: [baseEvent],
        scope: "this",
        updates: { title: "Modified Meeting" },
      });

      expect(updated).toHaveLength(1);
      expect(elementAt(updated, 0).id).toBe("recurring-1");
      expect(elementAt(updated, 0).uid).toBe(seriesUid);
    });

    it("should apply uid from updates on new override when scope this", () => {
      const customUid = "recurring-1@calendar.test";

      const baseEvent = createBaseRecurringEvent({
        uid: customUid,
      });

      const targetEvent = createTargetEvent();

      const result = updateRecurringEvent({
        targetEvent,
        currentEvents: [baseEvent],
        scope: "this",
        updates: { title: "Custom uid override", uid: customUid },
      }).events;

      const modifiedEvent = result.find((e) => e.id !== baseEvent.id);
      expect(modifiedEvent?.uid).toBe(customUid);
    });

    it("should report only the override (not the base) when editing a stored override in a consistent store", () => {
      const occurrenceISO = "2025-01-20T09:00:00.000Z";

      const baseEvent = createBaseRecurringEvent({
        exdates: [occurrenceISO],
      });

      const storedOverride = createTargetEvent({
        id: "recurring-1_override",
        recurrenceId: occurrenceISO,
        rrule: null,
        title: "Detached override",
      });

      const { updated, added, deleted } = updateRecurringEvent({
        currentEvents: [baseEvent, storedOverride],
        scope: "this",
        targetEvent: storedOverride,
        updates: { title: "Edited override" },
      });

      expect(added).toHaveLength(0);
      expect(deleted).toHaveLength(0);
      expect(updated).toHaveLength(1);
      expect(elementAt(updated, 0).id).toBe("recurring-1_override");
      expect(elementAt(updated, 0).title).toBe("Edited override");
    });

    it("should update base with exdate when editing an override the base does not yet exdate", () => {
      const occurrenceISO = "2025-01-20T09:00:00.000Z";
      const baseEvent = createBaseRecurringEvent();

      const storedOverride = createTargetEvent({
        id: "recurring-1_override",
        recurrenceId: occurrenceISO,
        rrule: null,
        title: "Detached override",
      });

      const { updated, added } = updateRecurringEvent({
        currentEvents: [baseEvent, storedOverride],
        scope: "this",
        targetEvent: storedOverride,
        updates: { title: "Edited override" },
      });

      expect(added).toHaveLength(0);
      expect(elementAt(updated, 0).id).toBe("recurring-1");
      expect(elementAt(updated, 0).exdates).toStrictEqual([occurrenceISO]);
    });

    it("should update override title when editing an override the base does not yet exdate", () => {
      const occurrenceISO = "2025-01-20T09:00:00.000Z";
      const baseEvent = createBaseRecurringEvent();

      const storedOverride = createTargetEvent({
        id: "recurring-1_override",
        recurrenceId: occurrenceISO,
        rrule: null,
        title: "Detached override",
      });

      const { updated } = updateRecurringEvent({
        currentEvents: [baseEvent, storedOverride],
        scope: "this",
        targetEvent: storedOverride,
        updates: { title: "Edited override" },
      });

      expect(updated).toHaveLength(2);
      expect(elementAt(updated, 1).id).toBe("recurring-1_override");
      expect(elementAt(updated, 1).title).toBe("Edited override");
    });

    it("should preserve existing EXDATES when adding new one", () => {
      const baseEvent = createBaseRecurringEvent({
        exdates: ["2025-01-13T09:00:00.000Z"],
      });

      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent];

      const result = updateRecurringEvent({
        currentEvents,
        targetEvent,
        scope: "this",
        updates: { title: "Modified" },
      }).events;

      const updatedBaseEvent = result.find((e) => e.id === baseEvent.id);
      expect(updatedBaseEvent?.exdates).toHaveLength(2);
      expect(updatedBaseEvent?.exdates).toContain("2025-01-13T09:00:00.000Z");
      expect(updatedBaseEvent?.exdates).toContain("2025-01-20T09:00:00.000Z");
    });
  });

  describe('scope: "following"', () => {
    it("should terminate original series with UNTIL when updating following", () => {
      const baseEvent = createBaseRecurringEvent();
      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent];

      const updates = {
        start: toZonedDateTime("2025-01-20T14:00:00"),
        title: "Modified Series",
      };

      const result = updateRecurringEvent({
        scope: "following",
        currentEvents,
        targetEvent,
        updates,
      }).events;

      // terminated original + new series
      expect(result).toHaveLength(2);

      // Original series should be terminated with UNTIL
      expect(terminatedUntil(result, baseEvent.id)).toStrictEqual(
        toDate(toZonedDateTime("2025-01-19T23:59:59.999Z"))
      );
    });

    it("should create new series starting from target date when updating following", () => {
      const baseEvent = createBaseRecurringEvent();
      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent];

      const updates = {
        start: toZonedDateTime("2025-01-20T14:00:00"),
        title: "Modified Series",
      };

      const result = updateRecurringEvent({
        scope: "following",
        currentEvents,
        targetEvent,
        updates,
      }).events;

      const newSeries = result.find((e) => e.id !== baseEvent.id);
      expect(newSeries?.title).toBe("Modified Series");
      expect(
        newSeries
          ? isSame(newSeries.start, toZonedDateTime("2025-01-20T14:00:00"))
          : false
      ).toBeTruthy();
      expect(newSeries?.uid).toBe("recurring-1_following@calendar.local");
      expect(newSeries?.recurrenceId).toBeUndefined();
    });

    it("should handle edge case when target is first occurrence", () => {
      const baseEvent = createBaseRecurringEvent();

      const firstOccurrence = {
        ...createTargetEvent(),
        start: toZonedDateTime("2025-01-06T09:00:00"),
      };

      const currentEvents = [baseEvent];

      const result = updateRecurringEvent({
        currentEvents,
        scope: "following",
        targetEvent: firstOccurrence,
        updates: { title: "New Series" },
      }).events;

      expect(result).toHaveLength(2);

      // Original should terminate before first occurrence (effectively making it empty)
      expect(terminatedUntil(result, baseEvent.id)).toStrictEqual(
        toDate(toZonedDateTime("2025-01-05T23:59:59.999Z"))
      );
    });

    it("should cascade-delete detached overrides whose occurrence is after the split", () => {
      const occurrenceDISO = "2025-01-20T09:00:00.000Z";
      const occurrenceFISO = "2025-01-27T09:00:00.000Z";

      const baseEvent = createBaseRecurringEvent({
        exdates: [occurrenceDISO, occurrenceFISO],
      });

      const overrideE = createTargetEvent({
        id: "recurring-1_overrideE",
        recurrenceId: occurrenceDISO,
        rrule: null,
        start: toZonedDateTime(occurrenceDISO),
        title: "Override E",
      });

      const overrideF = createTargetEvent({
        id: "recurring-1_overrideF",
        recurrenceId: occurrenceFISO,
        rrule: null,
        start: toZonedDateTime(occurrenceFISO),
        title: "Override F",
      });

      const targetEvent = createTargetEvent({
        start: toZonedDateTime(occurrenceDISO),
      });

      const { events, deleted } = updateRecurringEvent({
        targetEvent,
        currentEvents: [baseEvent, overrideE, overrideF],
        scope: "following",
        updates: { title: "New Series" },
      });

      const deletedIds = deleted.map((e) => e.id);
      expect(deletedIds).toContain("recurring-1_overrideE");
      expect(deletedIds).toContain("recurring-1_overrideF");
      expect(
        events.find((e) => e.id === "recurring-1_overrideE")
      ).toBeUndefined();
      expect(
        events.find((e) => e.id === "recurring-1_overrideF")
      ).toBeUndefined();
    });

    it("should update and strip exdates from terminated base when splitting after overrides", () => {
      const occurrenceDISO = "2025-01-20T09:00:00.000Z";
      const occurrenceFISO = "2025-01-27T09:00:00.000Z";

      const baseEvent = createBaseRecurringEvent({
        exdates: [occurrenceDISO, occurrenceFISO],
      });

      const overrideE = createTargetEvent({
        id: "recurring-1_overrideE",
        recurrenceId: occurrenceDISO,
        rrule: null,
        start: toZonedDateTime(occurrenceDISO),
        title: "Override E",
      });

      const overrideF = createTargetEvent({
        id: "recurring-1_overrideF",
        recurrenceId: occurrenceFISO,
        rrule: null,
        start: toZonedDateTime(occurrenceFISO),
        title: "Override F",
      });

      const targetEvent = createTargetEvent({
        start: toZonedDateTime(occurrenceDISO),
      });

      const { updated } = updateRecurringEvent({
        targetEvent,
        currentEvents: [baseEvent, overrideE, overrideF],
        scope: "following",
        updates: { title: "New Series" },
      });

      expect(updated).toHaveLength(1);
      const terminatedEvent = elementAt(updated, 0);
      expect(terminatedEvent.id).toBe("recurring-1");

      if (!terminatedEvent.rrule) {
        throw new Error("terminatedEvent.rrule missing");
      }

      expect(terminatedEvent.rrule.until).toBeDefined();
      expect(terminatedEvent.exdates).not.toContain(occurrenceDISO);
      expect(terminatedEvent.exdates).not.toContain(occurrenceFISO);
    });

    it("should create new series when updating following with cascade-deleted overrides", () => {
      const occurrenceDISO = "2025-01-20T09:00:00.000Z";
      const occurrenceFISO = "2025-01-27T09:00:00.000Z";

      const baseEvent = createBaseRecurringEvent({
        exdates: [occurrenceDISO, occurrenceFISO],
      });

      const overrideE = createTargetEvent({
        id: "recurring-1_overrideE",
        recurrenceId: occurrenceDISO,
        rrule: null,
        start: toZonedDateTime(occurrenceDISO),
        title: "Override E",
      });

      const overrideF = createTargetEvent({
        id: "recurring-1_overrideF",
        recurrenceId: occurrenceFISO,
        rrule: null,
        start: toZonedDateTime(occurrenceFISO),
        title: "Override F",
      });

      const targetEvent = createTargetEvent({
        start: toZonedDateTime(occurrenceDISO),
      });

      const { added } = updateRecurringEvent({
        targetEvent,
        currentEvents: [baseEvent, overrideE, overrideF],
        scope: "following",
        updates: { title: "New Series" },
      });

      expect(added).toHaveLength(1);
      expect(added[0]?.id).toBe("recurring-1_following");
    });
  });

  describe('scope: "all"', () => {
    it("should update the base recurring event", () => {
      const baseEvent = createBaseRecurringEvent();
      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent];

      const updates = {
        rrule: {
          // Match event start time
          dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00")),
          freq: FREQ.DAILY,
          interval: 1,
        },
        title: "Updated All Events",
      };

      const result = updateRecurringEvent({
        scope: "all",
        currentEvents,
        targetEvent,
        updates,
      }).events;

      expect(result).toHaveLength(1);

      const updatedEvent = elementAt(result, 0);
      expect(updatedEvent.title).toBe("Updated All Events");

      if (!updatedEvent.rrule) {
        throw new Error("updatedEvent.rrule missing");
      }

      expect(updatedEvent.rrule.freq).toBe(FREQ.DAILY);
      expect(updatedEvent.id).toBe(baseEvent.id);
      expect(updatedEvent.uid).toBe("recurring-1@calendar.test");
    });

    it("should keep uid on scope all updated row for onEventUpdate even when updates omit uid", () => {
      const baseEvent = createBaseRecurringEvent({
        uid: "series-uid@calendar.test",
      });

      const targetInstance = createTargetEvent({
        rrule: null,
        uid: "series-uid@calendar.test",
      });

      const { updated } = updateRecurringEvent({
        currentEvents: [baseEvent],
        scope: "all",
        targetEvent: targetInstance,
        updates: { title: "Series title" },
      });

      expect(updated).toHaveLength(1);
      expect(elementAt(updated, 0).uid).toBe("series-uid@calendar.test");
    });

    it("should preserve other events in the array", () => {
      const baseEvent = createBaseRecurringEvent();

      const otherEvent = createBaseRecurringEvent({
        id: "other-event",
        uid: "other@test",
      });

      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent, otherEvent];

      const result = updateRecurringEvent({
        currentEvents,
        targetEvent,
        scope: "all",
        updates: { title: "Updated" },
      }).events;

      expect(result).toHaveLength(2);
      expect(result.find((e) => e.id === "other-event")).toBeDefined();
    });

    it("should keep base series anchor when editing a later instance (scope: all)", () => {
      const mondayStartISO = "2025-01-06T09:00:00.000Z";
      const fridayStartISO = "2025-01-10T09:00:00.000Z";

      const baseEvent = createBaseRecurringEvent({
        end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
        rrule: {
          byweekday: [
            WEEKDAYS.MO,
            WEEKDAYS.TU,
            WEEKDAYS.WE,
            WEEKDAYS.TH,
            WEEKDAYS.FR,
          ],
          dtstart: toDate(toZonedDateTime(mondayStartISO)),
          freq: FREQ.WEEKLY,
          interval: 1,
        },
        start: toZonedDateTime(mondayStartISO),
      });

      const fridayInstance = createTargetEvent({
        end: toZonedDateTime("2025-01-10T10:00:00.000Z"),
        id: "recurring-1_4",
        start: toZonedDateTime(fridayStartISO),
      });

      const result = updateRecurringEvent({
        currentEvents: [baseEvent],
        scope: "all",
        targetEvent: fridayInstance,
        updates: {
          end: toZonedDateTime("2025-01-10T10:00:00.000Z"),
          rrule: {
            byweekday: [
              WEEKDAYS.MO,
              WEEKDAYS.TU,
              WEEKDAYS.WE,
              WEEKDAYS.TH,
              WEEKDAYS.FR,
            ],
            dtstart: toDate(toZonedDateTime(fridayStartISO)),
            freq: FREQ.WEEKLY,
            interval: 1,
          },
          start: toZonedDateTime(fridayStartISO),
          title: "Updated Weekdays",
        },
      }).events;

      const updatedBase = elementAt(result, 0);
      expect(updatedBase.title).toBe("Updated Weekdays");
      expect(toISOString(updatedBase.start)).toBe(mondayStartISO);

      if (!updatedBase.rrule) {
        throw new Error("updatedBase.rrule missing");
      }

      expect(updatedBase.rrule.dtstart?.toISOString()).toBe(mondayStartISO);
    });

    it("should generate correct instances when editing later instance with scope all", () => {
      const mondayStartISO = "2025-01-06T09:00:00.000Z";
      const fridayStartISO = "2025-01-10T09:00:00.000Z";

      const baseEvent = createBaseRecurringEvent({
        end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
        rrule: {
          byweekday: [
            WEEKDAYS.MO,
            WEEKDAYS.TU,
            WEEKDAYS.WE,
            WEEKDAYS.TH,
            WEEKDAYS.FR,
          ],
          dtstart: toDate(toZonedDateTime(mondayStartISO)),
          freq: FREQ.WEEKLY,
          interval: 1,
        },
        start: toZonedDateTime(mondayStartISO),
      });

      const fridayInstance = createTargetEvent({
        end: toZonedDateTime("2025-01-10T10:00:00.000Z"),
        id: "recurring-1_4",
        start: toZonedDateTime(fridayStartISO),
      });

      const result = updateRecurringEvent({
        currentEvents: [baseEvent],
        scope: "all",
        targetEvent: fridayInstance,
        updates: {
          end: toZonedDateTime("2025-01-10T10:00:00.000Z"),
          rrule: {
            byweekday: [
              WEEKDAYS.MO,
              WEEKDAYS.TU,
              WEEKDAYS.WE,
              WEEKDAYS.TH,
              WEEKDAYS.FR,
            ],
            dtstart: toDate(toZonedDateTime(fridayStartISO)),
            freq: FREQ.WEEKLY,
            interval: 1,
          },
          start: toZonedDateTime(fridayStartISO),
          title: "Updated Weekdays",
        },
      }).events;

      const updatedBase = elementAt(result, 0);

      const instances = generateRecurringEvents({
        currentEvents: result,
        endDate: toZonedDateTime("2025-01-12T23:59:59.999Z"),
        event: updatedBase,
        startDate: toZonedDateTime("2025-01-06T00:00:00.000Z"),
      });

      expect(instances).toHaveLength(5);
      expect(toISOString(elementAt(instances, 0).start)).toBe(mondayStartISO);
      expect(toISOString(elementAt(instances, 4).start)).toBe(fridayStartISO);
    });

    it("should apply time delta from target instance to base (scope: all)", () => {
      const mondayStartISO = "2025-01-06T09:00:00.000Z";

      const baseEvent = createBaseRecurringEvent({
        end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
        start: toZonedDateTime(mondayStartISO),
      });

      const fridayInstance = createTargetEvent({
        end: toZonedDateTime("2025-01-10T10:00:00.000Z"),
        start: toZonedDateTime("2025-01-10T09:00:00.000Z"),
      });

      const result = updateRecurringEvent({
        currentEvents: [baseEvent],
        scope: "all",
        targetEvent: fridayInstance,
        updates: {
          end: toZonedDateTime("2025-01-10T12:00:00.000Z"),
          start: toZonedDateTime("2025-01-10T11:00:00.000Z"),
        },
      }).events;

      expect(toISOString(elementAt(result, 0).start)).toBe(
        "2025-01-06T11:00:00.000Z"
      );
      expect(toISOString(elementAt(result, 0).end)).toBe(
        "2025-01-06T12:00:00.000Z"
      );
    });

    it("should return exactly one base row with exdates cleared", () => {
      const baseEvent = makeDailySeries();

      const targetEvent = makeDailySeries({
        end: toZonedDateTime("2025-01-08T10:00:00.000Z"),
        id: "daily-1_2",
        rrule: null,
        start: toZonedDateTime("2025-01-08T09:00:00.000Z"),
      });

      const unrelated = createBaseRecurringEvent({
        id: "other-event",
        uid: "other@test",
      });

      const result = updateRecurringEvent({
        targetEvent,
        currentEvents: [baseEvent, unrelated],
        scope: "all",
        updates: { title: "Reset Series" },
      }).events;

      const seriesRows = result.filter(
        (e) => e.uid === "daily-1@calendar.test"
      );

      expect(seriesRows).toHaveLength(1);
      expect(seriesRows[0]?.title).toBe("Reset Series");
      expect(seriesRows[0]?.exdates).toBeUndefined();
      expect(result.find((e) => e.id === "other-event")).toBeDefined();
    });

    it("should remove a pre-existing detached override of the same series", () => {
      const baseEvent = makeDailySeries({
        exdates: ["2025-01-07T09:00:00.000Z"],
      });

      const override = makeOverride(baseEvent, {
        exdates: null,
        id: "daily-1_override",
        title: "Detached Override",
      });

      const targetEvent = makeDailySeries({
        end: toZonedDateTime("2025-01-08T10:00:00.000Z"),
        id: "daily-1_2",
        rrule: null,
        start: toZonedDateTime("2025-01-08T09:00:00.000Z"),
      });

      const result = updateRecurringEvent({
        targetEvent,
        currentEvents: [baseEvent, override],
        scope: "all",
        updates: { title: "Reset Series" },
      }).events;

      expect(result).toHaveLength(1);
      expect(elementAt(result, 0).id).toBe("daily-1");
      expect(result.find((e) => e.id === "daily-1_override")).toBeUndefined();
    });

    it("should apply submitted wall-clock time to the base anchor date and preserve duration", () => {
      const baseEvent = makeDailySeries();

      const targetEvent = makeDailySeries({
        end: toZonedDateTime("2025-01-08T10:00:00.000Z"),
        id: "daily-1_2",
        rrule: null,
        start: toZonedDateTime("2025-01-08T09:00:00.000Z"),
      });

      const result = updateRecurringEvent({
        targetEvent,
        currentEvents: [baseEvent],
        scope: "all",
        updates: { start: toZonedDateTime("2025-01-08T14:30:00.000Z") },
      }).events;

      // keeps original anchor date (Jan 6), new time-of-day (14:30)
      expect(toISOString(elementAt(result, 0).start)).toBe(
        "2025-01-06T14:30:00.000Z"
      );
      // duration preserved (1 hour) since no end submitted
      expect(toISOString(elementAt(result, 0).end)).toBe(
        "2025-01-06T15:30:00.000Z"
      );
    });

    it("should resurrect a previously-deleted occurrence by clearing exdates (Google-Calendar reset behavior)", () => {
      // 1. Start a daily series
      const baseEvent = makeDailySeries();

      // 2. Delete one occurrence with scope "this" -> produces an EXDATE
      const occurrenceToDelete = makeDailySeries({
        end: toZonedDateTime("2025-01-07T10:00:00.000Z"),
        id: "daily-1_1",
        rrule: null,
        start: toZonedDateTime("2025-01-07T09:00:00.000Z"),
      });

      const afterDelete = deleteRecurringEvent({
        currentEvents: [baseEvent],
        scope: "this",
        targetEvent: occurrenceToDelete,
      }).events;

      expect(afterDelete[0]?.exdates).toContain("2025-01-07T09:00:00.000Z");

      // 3. Edit the series with scope "all" -> the deleted occurrence is resurrected
      const afterAllEdit = updateRecurringEvent({
        currentEvents: afterDelete,
        scope: "all",
        targetEvent: makeDailySeries({
          end: toZonedDateTime("2025-01-08T10:00:00.000Z"),
          id: "daily-1_2",
          rrule: null,
          start: toZonedDateTime("2025-01-08T09:00:00.000Z"),
        }),
        updates: { title: "Reset Series" },
      }).events;

      expect(afterAllEdit).toHaveLength(1);
      expect(afterAllEdit[0]?.exdates).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("should throw error when base recurring event not found", () => {
      const targetEvent = createTargetEvent();
      const currentEvents: CalendarEvent[] = [];

      expect(() => {
        updateRecurringEvent({
          currentEvents,
          targetEvent,
          scope: "this",
          updates: { title: "Test" },
        });
      }).toThrow("Base recurring event not found");
    });

    it("should throw error for invalid scope", () => {
      const baseEvent = createBaseRecurringEvent();
      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent];

      // The plugin boundary receives an untrusted scope; the validation that
      // rejects it lives there, so exercise that path rather than lying to the
      // util's narrower type.
      expect(() => {
        recurrencePlugin().applyEdit?.({
          currentEvents,
          event: targetEvent,
          scope: "invalid",
          updates: { title: "Test" },
        });
      }).toThrow(
        "Invalid scope: invalid. Must be 'this', 'following', or 'all'"
      );
    });
  });
});

describe(deleteRecurringEvent, () => {
  describe('scope: "this"', () => {
    it("should add EXDATE to exclude only target occurrence", () => {
      const baseEvent = createBaseRecurringEvent();
      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent];

      const result = deleteRecurringEvent({
        currentEvents,
        targetEvent,
        scope: "this",
      }).events;

      expect(result).toHaveLength(1);

      const updatedEvent = elementAt(result, 0);
      expect(updatedEvent.exdates).toHaveLength(1);
      expect(updatedEvent.exdates).toContain("2025-01-20T09:00:00.000Z");
      expect(updatedEvent.id).toBe(baseEvent.id);
    });

    it("should preserve existing EXDATES when adding new exclusion", () => {
      const baseEvent = createBaseRecurringEvent({
        exdates: ["2025-01-13T09:00:00.000Z", "2025-01-27T09:00:00.000Z"],
      });

      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent];

      const result = deleteRecurringEvent({
        currentEvents,
        targetEvent,
        scope: "this",
      }).events;

      const updatedEvent = elementAt(result, 0);
      expect(updatedEvent.exdates).toHaveLength(3);
      expect(updatedEvent.exdates).toContain("2025-01-13T09:00:00.000Z");
      expect(updatedEvent.exdates).toContain("2025-01-27T09:00:00.000Z");
      expect(updatedEvent.exdates).toContain("2025-01-20T09:00:00.000Z");
    });

    it("should report only delete when deleting a detached override", () => {
      const occurrenceISO = "2025-01-20T09:00:00.000Z";

      const baseEvent = createBaseRecurringEvent({
        exdates: [occurrenceISO],
      });

      const storedOverride = createTargetEvent({
        id: "recurring-1_override",
        recurrenceId: occurrenceISO,
        rrule: null,
      });

      const overrideDelete = deleteRecurringEvent({
        currentEvents: [baseEvent, storedOverride],
        scope: "this",
        targetEvent: storedOverride,
      });

      expect(overrideDelete.updated).toHaveLength(0);
      expect(overrideDelete.deleted).toHaveLength(1);
      expect(elementAt(overrideDelete.deleted, 0).id).toBe(
        "recurring-1_override"
      );
    });

    it("should report only update when deleting a generated instance", () => {
      const occurrenceISO = "2025-01-20T09:00:00.000Z";
      const freshBase = createBaseRecurringEvent();
      const generatedInstance = createTargetEvent({ rrule: null });

      const instanceDelete = deleteRecurringEvent({
        currentEvents: [freshBase],
        scope: "this",
        targetEvent: generatedInstance,
      });

      expect(instanceDelete.deleted).toHaveLength(0);
      expect(instanceDelete.updated).toHaveLength(1);
      expect(elementAt(instanceDelete.updated, 0).exdates).toContain(
        occurrenceISO
      );
    });
  });

  describe('scope: "following"', () => {
    it("should terminate series with UNTIL before target date", () => {
      const baseEvent = createBaseRecurringEvent();
      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent];

      const result = deleteRecurringEvent({
        currentEvents,
        targetEvent,
        scope: "following",
      }).events;

      expect(result).toHaveLength(1);

      const terminatedEvent = elementAt(result, 0);

      if (!terminatedEvent.rrule) {
        throw new Error("rrule missing");
      }

      expect(terminatedEvent.rrule.until).toStrictEqual(
        toDate(toZonedDateTime("2025-01-19T23:59:59.999Z"))
      );
      expect(terminatedEvent.id).toBe(baseEvent.id);
    });

    it("should handle deletion from first occurrence correctly", () => {
      const baseEvent = createBaseRecurringEvent();

      const firstOccurrence = {
        ...createTargetEvent(),
        start: toZonedDateTime("2025-01-06T09:00:00"),
      };

      const currentEvents = [baseEvent];

      const result = deleteRecurringEvent({
        currentEvents,
        scope: "following",
        targetEvent: firstOccurrence,
      }).events;

      const terminatedEvent = elementAt(result, 0);

      if (!terminatedEvent.rrule) {
        throw new Error("rrule missing");
      }

      expect(terminatedEvent.rrule.until).toStrictEqual(
        toDate(toZonedDateTime("2025-01-05T23:59:59.999Z"))
      );
    });

    it("should handle existing UNTIL in RRULE correctly", () => {
      const baseEvent = createBaseRecurringEvent({
        rrule: {
          byweekday: [WEEKDAYS.MO],
          // Match event start time
          dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00")),
          freq: FREQ.WEEKLY,
          interval: 1,
          until: toDate(toZonedDateTime("2025-12-31T00:00:00Z")),
        },
      });

      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent];

      const result = deleteRecurringEvent({
        currentEvents,
        targetEvent,
        scope: "following",
      }).events;

      const terminatedEvent = elementAt(result, 0);

      // Should replace existing UNTIL with earlier termination date
      if (!terminatedEvent.rrule) {
        throw new Error("rrule missing");
      }

      expect(terminatedEvent.rrule.until).toStrictEqual(
        toDate(toZonedDateTime("2025-01-19T23:59:59.999Z"))
      );
    });
  });

  describe('scope: "all"', () => {
    it("should remove entire recurring series", () => {
      const baseEvent = createBaseRecurringEvent();

      const otherEvent = createBaseRecurringEvent({
        id: "other",
        uid: "other@test",
      });

      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent, otherEvent];

      const result = deleteRecurringEvent({
        currentEvents,
        targetEvent,
        scope: "all",
      }).events;

      expect(result).toHaveLength(1);
      expect(elementAt(result, 0).id).toBe("other");
      expect(
        result.find((e) => e.uid === "recurring-1@calendar.test")
      ).toBeUndefined();
    });

    it("should handle empty result when only target series exists", () => {
      const baseEvent = createBaseRecurringEvent();
      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent];

      const result = deleteRecurringEvent({
        currentEvents,
        targetEvent,
        scope: "all",
      }).events;

      expect(result).toHaveLength(0);
    });

    it("should remove all events with same UID including overrides", () => {
      const baseEvent = createBaseRecurringEvent();

      const override1 = {
        ...createTargetEvent(),
        id: "override1",
        recurrenceId: "2025-01-13T09:00:00.000Z",
      };

      const override2 = {
        ...createTargetEvent(),
        id: "override2",
        recurrenceId: "2025-01-20T09:00:00.000Z",
      };

      const otherEvent = createBaseRecurringEvent({
        id: "other",
        uid: "other@test",
      });

      const currentEvents = [baseEvent, override1, override2, otherEvent];
      const targetEvent = createTargetEvent();

      const result = deleteRecurringEvent({
        currentEvents,
        targetEvent,
        scope: "all",
      }).events;

      expect(result).toHaveLength(1);
      expect(elementAt(result, 0).id).toBe("other");
    });
  });

  describe("error handling", () => {
    it("should throw error when base recurring event not found", () => {
      const targetEvent = createTargetEvent();
      const currentEvents: CalendarEvent[] = [];

      expect(() => {
        deleteRecurringEvent({
          currentEvents,
          targetEvent,
          scope: "this",
        });
      }).toThrow("Base recurring event not found");
    });

    it("should throw error for invalid scope", () => {
      const baseEvent = createBaseRecurringEvent();
      const targetEvent = createTargetEvent();
      const currentEvents = [baseEvent];

      expect(() => {
        recurrencePlugin().applyDelete?.({
          currentEvents,
          event: targetEvent,
          scope: "invalid",
        });
      }).toThrow(
        "Invalid scope: invalid. Must be 'this', 'following', or 'all'"
      );
    });
  });
});

describe("Edge cases and stress tests", () => {
  it("should handle complex RRULE with COUNT limit", () => {
    const baseEvent = createBaseRecurringEvent({
      rrule: {
        byweekday: [WEEKDAYS.MO, WEEKDAYS.WE, WEEKDAYS.FR],
        count: 10,
        // Match event start time
        dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00")),
        freq: FREQ.WEEKLY,
        interval: 1,
      },
    });

    const result = generateRecurringEvents({
      currentEvents: [],
      endDate: toZonedDateTime("2025-02-28"),
      event: baseEvent,
      startDate: toZonedDateTime("2025-01-01"),
    });

    expect(result).toHaveLength(10);
  });

  it("should handle daily recurring event with interval", () => {
    const baseEvent = createBaseRecurringEvent({
      rrule: {
        // Match event start time
        dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00")),
        freq: FREQ.DAILY,
        interval: 3,
      },
    });

    const result = generateRecurringEvents({
      currentEvents: [],
      endDate: toZonedDateTime("2025-01-20"),
      event: baseEvent,
      startDate: toZonedDateTime("2025-01-06"),
    });

    // Every 3 days: 6, 9, 12, 15, 18
    expect(result).toHaveLength(5);
    expect(format(elementAt(result, 0).start, "YYYY-MM-DD")).toBe("2025-01-06");
    expect(format(elementAt(result, 1).start, "YYYY-MM-DD")).toBe("2025-01-09");
    expect(format(elementAt(result, 2).start, "YYYY-MM-DD")).toBe("2025-01-12");
  });

  it("should handle monthly recurring event", () => {
    const baseEvent = createBaseRecurringEvent({
      rrule: {
        bymonthday: [15],
        // Match event start time
        dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00")),
        freq: FREQ.MONTHLY,
        interval: 1,
      },
    });

    const result = generateRecurringEvents({
      currentEvents: [],
      endDate: toZonedDateTime("2025-06-30"),
      event: baseEvent,
      startDate: toZonedDateTime("2025-01-01"),
    });

    // Jan 15, Feb 15, Mar 15, Apr 15, May 15, Jun 15
    expect(result).toHaveLength(6);
  });

  it("should handle updating and then deleting same event", () => {
    const baseEvent = createBaseRecurringEvent();
    const targetEvent = createTargetEvent();
    let currentEvents = [baseEvent];

    // First update "this" event
    currentEvents = updateRecurringEvent({
      currentEvents,
      targetEvent,
      scope: "this",
      updates: { title: "Modified" },
    }).events;

    // base + modified
    expect(currentEvents).toHaveLength(2);

    // Then delete the same occurrence
    const finalResult = deleteRecurringEvent({
      currentEvents,
      targetEvent,
      scope: "this",
    }).events;

    expect(finalResult).toHaveLength(1);
    const baseEventResult = elementAt(finalResult, 0);
    expect(baseEventResult.exdates).toHaveLength(1);
    expect(baseEventResult.exdates).toContain("2025-01-20T09:00:00.000Z");
  });

  it("should remove detached override when deleting the modified occurrence", () => {
    const baseEvent = createBaseRecurringEvent();
    const targetEvent = createTargetEvent();
    let currentEvents = [baseEvent];

    currentEvents = updateRecurringEvent({
      currentEvents,
      targetEvent,
      scope: "this",
      updates: {
        end: toZonedDateTime("2025-01-20T15:00:00"),
        start: toZonedDateTime("2025-01-20T14:00:00"),
        title: "Modified Title",
      },
    }).events;

    const modifiedOverride = currentEvents.find((e) =>
      hasValue(e.recurrenceId)
    );

    if (!modifiedOverride) {
      throw new Error("Expected a detached override");
    }

    const finalResult = deleteRecurringEvent({
      currentEvents,
      scope: "this",
      targetEvent: modifiedOverride,
    }).events;

    expect(finalResult).toHaveLength(1);
    expect(elementAt(finalResult, 0).exdates).toContain(
      "2025-01-20T09:00:00.000Z"
    );

    const visibleOccurrences = generateRecurringEvents({
      currentEvents: finalResult,
      endDate: toZonedDateTime("2025-01-27T00:00:00"),
      event: elementAt(finalResult, 0),
      startDate: toZonedDateTime("2025-01-13T00:00:00"),
    });

    const deletedDayOccurrences = visibleOccurrences.filter((e) =>
      isSame(e.start, toZonedDateTime("2025-01-20T00:00:00"), "day")
    );

    expect(deletedDayOccurrences).toHaveLength(0);
  });

  it('should handle multiple "following" updates creating series chain', () => {
    const baseEvent = createBaseRecurringEvent();
    let currentEvents = [baseEvent];

    // Update "following" from first occurrence
    const firstTarget = {
      ...createTargetEvent(),
      start: toZonedDateTime("2025-01-06T09:00:00"),
    };

    currentEvents = updateRecurringEvent({
      currentEvents,
      scope: "following",
      targetEvent: firstTarget,
      updates: { title: "First Split" },
    }).events;

    // terminated original + new series
    expect(currentEvents).toHaveLength(2);

    // Update "following" from later occurrence in new series
    const secondTarget = {
      ...createTargetEvent(),
      start: toZonedDateTime("2025-01-20T09:00:00"),
      uid: "recurring-1_following@calendar.local",
    };

    currentEvents = updateRecurringEvent({
      currentEvents,
      scope: "following",
      targetEvent: secondTarget,
      updates: { title: "Second Split" },
    }).events;

    // original terminated + first series terminated + second series
    expect(currentEvents).toHaveLength(3);
  });

  it('should preserve duration when creating new series in "following" scope', () => {
    const baseEvent = createBaseRecurringEvent({
      // 2.5 hour duration
      end: toZonedDateTime("2025-01-06T11:30:00"),
      start: toZonedDateTime("2025-01-06T09:00:00"),
    });

    const targetEvent = {
      ...createTargetEvent(),
      end: toZonedDateTime("2025-01-20T11:30:00"),
      start: toZonedDateTime("2025-01-20T09:00:00"),
    };

    const result = updateRecurringEvent({
      targetEvent,
      currentEvents: [baseEvent],
      scope: "following",
      // Change start time
      updates: { start: toZonedDateTime("2025-01-20T14:00:00") },
    }).events;

    const newSeries = result.find(
      (e) => e.uid?.includes("_following") === true
    );

    expect(newSeries ? format(newSeries.start, "HH:mm") : undefined).toBe(
      "14:00"
    );

    // Should preserve 2.5 hour duration
    expect(newSeries ? format(newSeries.end, "HH:mm") : undefined).toBe(
      "16:30"
    );
  });
});
