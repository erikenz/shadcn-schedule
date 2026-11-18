import { describe, expect, it } from "vitest";

import type { RRuleOptions } from "@/plugins/recurrence/types";
import { generateRecurringEvents } from "@/plugins/recurrence/utils/generate-recurring-events";
import {
  FREQ,
  WEEKDAYS,
} from "@/plugins/recurrence/utils/recurrence-constants";
import { elementAt } from "@/test-utils/element-at";
import type { CalendarEvent } from "@/types/index";
import {
  endOf,
  startOf,
  toDate,
  toISOString,
  toZonedDateTime,
} from "@/utils/temporal";

// Call wrapper: supplies the always-empty currentEvents and full-range defaults.
const generate = (
  event: CalendarEvent,
  start = startOf(toZonedDateTime("2025-01-06"), "day"),
  end = endOf(toZonedDateTime("2025-01-20"), "day")
) =>
  generateRecurringEvents({
    event,
    currentEvents: [],
    endDate: end,
    startDate: start,
  });

// Factory for a daily recurring event starting Jan 6 at the given hour.
const makeDailyEvent = (
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
  exdates: [],
  id: "daily-1",
  rrule: {
    dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00.000Z")),
    freq: FREQ.DAILY,
    interval: 1,
  },
  start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
  title: "Daily Event",
  uid: "daily-1@calendar.local",
  ...overrides,
});

// Returns each generated instance's start ISO, in order, so tests can assert
// the generated instances without carrying assertion logic out of it() blocks.
const instanceStartISOs = (result: CalendarEvent[]) =>
  result.map((event) => toISOString(event.start));

describe("generateRecurringEvents - Calendar Provider Integration", () => {
  const baseEvent: CalendarEvent = {
    end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
    exdates: [],
    id: "recurring-1",
    rrule: {
      byweekday: [WEEKDAYS.MO, WEEKDAYS.WE, WEEKDAYS.FR],
      // Match event start time
      dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00.000Z")),
      freq: FREQ.WEEKLY,
      interval: 1,
    },
    // Monday
    start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
    title: "Weekly Meeting",
    uid: "recurring-1@calendar.local",
  };

  it("should generate instances with same UID as parent and no recurrenceId", () => {
    const result = generate(baseEvent);

    // Should generate events: Jan 6,8,10 (week 1), Jan 13,15,17 (week 2), Jan 20 (week 3)
    // 2 full weeks × 3 days + 1 day from week 3
    expect(result).toHaveLength(7);

    // All instances should have same UID as parent (for proper grouping)
    for (const instance of result) {
      // Same UID as base event
      expect(instance.uid).toBe(baseEvent.uid);
      // No RRULE (identifies as instance)
      expect(instance.rrule).toBeUndefined();
      // No recurrenceId (not modified)
      expect(instance.recurrenceId).toBeUndefined();
    }

    // Check first event (original Monday)
    const firstEvent = elementAt(result, 0);
    const wednesdayEvent = elementAt(result, 1);
    const fridayEvent = elementAt(result, 2);
    expect(firstEvent.id).toBe("recurring-1_0");
    expect(firstEvent.title).toBe("Weekly Meeting");

    // Check Wednesday event
    expect(toISOString(wednesdayEvent.start)).toBe("2025-01-08T09:00:00.000Z");

    // Check Friday event
    expect(toISOString(fridayEvent.start)).toBe("2025-01-10T09:00:00.000Z");
  });

  it("should generate UID for parent when missing and use same UID for all instances", () => {
    const eventWithoutUID: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T09:30:00.000Z"),
      id: "recurring-2",
      rrule: {
        byweekday: [WEEKDAYS.MO, WEEKDAYS.WE, WEEKDAYS.FR],
        // Match event start time
        dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00.000Z")),
        freq: FREQ.WEEKLY,
        interval: 1,
      },
      start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
      title: "Daily Standup",
    };

    const result = generate(eventWithoutUID);

    expect(result).toHaveLength(7);

    // All instances should have the same generated UID (not unique per instance)
    const expectedUID = `${eventWithoutUID.id}@calendar.local`;

    for (const instance of result) {
      // Same generated UID for all instances
      expect(instance.uid).toBe(expectedUID);
      // No RRULE (identifies as instance)
      expect(instance.rrule).toBeUndefined();
      // No recurrenceId (not modified)
      expect(instance.recurrenceId).toBeUndefined();
    }
  });

  it("should handle EXDATE exclusions correctly", () => {
    const eventWithExdates: CalendarEvent = {
      ...baseEvent,
      // Exclude Wednesday Jan 8
      exdates: ["2025-01-08T09:00:00.000Z"],
    };

    const result = generate(eventWithExdates);

    // Should have 6 events instead of 7 (excluding Jan 8)
    expect(result).toHaveLength(6);

    // Verify Wednesday Jan 8 is not included (check by start time)
    const excludedDate = result.find(
      (event) => toISOString(event.start) === "2025-01-08T09:00:00.000Z"
    );

    expect(excludedDate).toBeUndefined();

    // But Friday Jan 10 should still be there
    const fridayEvent = result.find(
      (event) => toISOString(event.start) === "2025-01-10T09:00:00.000Z"
    );

    expect(fridayEvent).toBeDefined();
  });

  it("should handle daily recurring events", () => {
    const dailyEvent = makeDailyEvent({
      end: toZonedDateTime("2025-01-06T09:30:00.000Z"),
      title: "Daily Standup",
    });

    const shortRange = startOf(toZonedDateTime("2025-01-06"), "day");
    const shortEnd = endOf(toZonedDateTime("2025-01-10"), "day");
    const result = generate(dailyEvent, shortRange, shortEnd);

    // Should generate 5 daily events (Jan 6-10)
    expect(result).toHaveLength(5);

    for (const [index, event] of result.entries()) {
      const expectedDate = toZonedDateTime("2025-01-06").add({ days: index });
      // No recurrenceId for unmodified instances
      expect(event.recurrenceId).toBeUndefined();
      expect(toISOString(event.start)).toBe(
        toISOString(expectedDate.with({ hour: 9 }))
      );
      expect(toISOString(event.end)).toBe(
        toISOString(expectedDate.with({ hour: 9, minute: 30 }))
      );
    }
  });
});

describe("Monthly and Complex Patterns", () => {
  it("should generate early monthly recurring events (Jan, Feb)", () => {
    const monthlyEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T15:00:00.000Z"),
      exdates: [],
      id: "monthly-1",
      rrule: {
        // Match event start time
        dtstart: toDate(toZonedDateTime("2025-01-06T14:00:00.000Z")),
        freq: FREQ.MONTHLY,
        interval: 1,
      },
      start: toZonedDateTime("2025-01-06T14:00:00.000Z"),
      title: "Monthly Review",
      uid: "monthly-1@calendar.local",
    };

    const longRange = startOf(toZonedDateTime("2025-01-01"), "day");
    const longEnd = endOf(toZonedDateTime("2025-04-30"), "day");
    const result = generate(monthlyEvent, longRange, longEnd);

    // Should generate 4 monthly events (Jan, Feb, Mar, Apr)
    expect(result).toHaveLength(4);

    // Check first occurrence (January 6) - no recurrenceId for unmodified instance
    expect(elementAt(result, 0).recurrenceId).toBeUndefined();
    expect(toISOString(elementAt(result, 0).start)).toBe(
      "2025-01-06T14:00:00.000Z"
    );

    // Check second occurrence (February 6)
    expect(elementAt(result, 1).recurrenceId).toBeUndefined();
    expect(toISOString(elementAt(result, 1).start)).toBe(
      "2025-02-06T14:00:00.000Z"
    );
  });

  it("should generate later monthly recurring events (Mar, Apr)", () => {
    const monthlyEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T15:00:00.000Z"),
      exdates: [],
      id: "monthly-1",
      rrule: {
        dtstart: toDate(toZonedDateTime("2025-01-06T14:00:00.000Z")),
        freq: FREQ.MONTHLY,
        interval: 1,
      },
      start: toZonedDateTime("2025-01-06T14:00:00.000Z"),
      title: "Monthly Review",
      uid: "monthly-1@calendar.local",
    };

    const longRange = startOf(toZonedDateTime("2025-01-01"), "day");
    const longEnd = endOf(toZonedDateTime("2025-04-30"), "day");
    const result = generate(monthlyEvent, longRange, longEnd);

    // Check third occurrence (March 6)
    expect(elementAt(result, 2).recurrenceId).toBeUndefined();
    expect(toISOString(elementAt(result, 2).start)).toBe(
      "2025-03-06T14:00:00.000Z"
    );

    // Check fourth occurrence (April 6)
    expect(elementAt(result, 3).recurrenceId).toBeUndefined();
    expect(toISOString(elementAt(result, 3).start)).toBe(
      "2025-04-06T14:00:00.000Z"
    );
  });

  it("should handle COUNT limits in RRULE", () => {
    const limitedEvent = makeDailyEvent({
      id: "limited-1",
      rrule: {
        count: 3,
        // Match event start time
        dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00.000Z")),
        freq: FREQ.DAILY,
        interval: 1,
      },
      title: "Limited Series",
      uid: "limited-1@calendar.local",
    });

    const result = generate(limitedEvent);

    // Should generate exactly 3 events due to COUNT=3
    expect(result).toHaveLength(3);
    expect(result.map((event) => event.recurrenceId)).toStrictEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(instanceStartISOs(result)).toStrictEqual([
      "2025-01-06T09:00:00.000Z",
      "2025-01-07T09:00:00.000Z",
      "2025-01-08T09:00:00.000Z",
    ]);
  });

  it("should handle UNTIL limits in RRULE", () => {
    const untilEvent = makeDailyEvent({
      id: "until-1",
      rrule: {
        // Match event start time
        dtstart: toDate(toZonedDateTime("2025-01-06T09:00:00.000Z")),
        freq: FREQ.DAILY,
        interval: 1,
        until: toDate(toZonedDateTime("2025-01-08T09:00:00.000Z")),
      },
      title: "Until Series",
      uid: "until-1@calendar.local",
    });

    const result = generate(untilEvent);

    // Should generate events until Jan 8 (inclusive)
    expect(result).toHaveLength(3);
    expect(result.map((event) => event.recurrenceId)).toStrictEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(instanceStartISOs(result)).toStrictEqual([
      "2025-01-06T09:00:00.000Z",
      "2025-01-07T09:00:00.000Z",
      "2025-01-08T09:00:00.000Z",
    ]);
  });

  it("should include events that span through the date range even if they start before it", () => {
    // Long duration event (4 hours) that occurs daily
    const longDurationEvent = makeDailyEvent({
      // Ends at 12 PM (4 hour duration)
      end: toZonedDateTime("2025-01-06T12:00:00.000Z"),
      id: "long-duration-1",
      rrule: {
        dtstart: toDate(toZonedDateTime("2025-01-06T08:00:00.000Z")),
        freq: FREQ.DAILY,
        interval: 1,
      },
      // Starts at 8 AM
      start: toZonedDateTime("2025-01-06T08:00:00.000Z"),
      title: "Long Meeting",
      uid: "long-duration-1@calendar.local",
    });

    // Query range: 10 AM to 2 PM on a specific day
    // The event starts before the range (8 AM) but spans into it (ends at 12 PM)
    // 10 AM next day
    const queryStart = toZonedDateTime("2025-01-07T10:00:00.000Z");
    // 2 PM next day
    const queryEnd = toZonedDateTime("2025-01-07T14:00:00.000Z");

    const result = generate(longDurationEvent, queryStart, queryEnd);

    // Should include the Jan 7 event that spans through the query range
    expect(result).toHaveLength(1);
    expect(toISOString(elementAt(result, 0).start)).toBe(
      "2025-01-07T08:00:00.000Z"
    );
    expect(toISOString(elementAt(result, 0).end)).toBe(
      "2025-01-07T12:00:00.000Z"
    );
  });

  it("should not include events that end before the date range starts", () => {
    // Short event that ends before our query range
    const shortEvent = makeDailyEvent({
      // 9 AM (1 hour duration)
      end: toZonedDateTime("2025-01-06T09:00:00.000Z"),
      id: "short-1",
      rrule: {
        dtstart: toDate(toZonedDateTime("2025-01-06T08:00:00.000Z")),
        freq: FREQ.DAILY,
        interval: 1,
      },
      // 8 AM
      start: toZonedDateTime("2025-01-06T08:00:00.000Z"),
      title: "Short Meeting",
      uid: "short-1@calendar.local",
    });

    // Query range: 10 AM to 2 PM
    // The event ends at 9 AM, so it doesn't span into the range
    const queryStart = toZonedDateTime("2025-01-07T10:00:00.000Z");
    const queryEnd = toZonedDateTime("2025-01-07T14:00:00.000Z");

    const result = generate(shortEvent, queryStart, queryEnd);

    // Should not include any events since they don't span the query range
    expect(result).toHaveLength(0);
  });

  it("should return empty array for events without RRULE", () => {
    const nonRecurringEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
      exdates: [],
      id: "single-1",
      start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
      title: "Single Event",
      uid: "single-1@calendar.local",
    };

    const result = generate(nonRecurringEvent);
    expect(result).toHaveLength(0);
  });

  it("should handle invalid RRULE options gracefully", () => {
    const malformedEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-06T10:00:00.000Z"),
      exdates: [],
      id: "malformed-1",
      rrule: {
        // 999 is not a valid frequency code, so this rule throws at evaluation.
        freq: 999,
      } satisfies RRuleOptions,
      start: toZonedDateTime("2025-01-06T09:00:00.000Z"),
      title: "Invalid RRULE",
      uid: "malformed-1@calendar.local",
    };

    // Should throw an error for invalid RRULE options
    expect(() => {
      generate(malformedEvent);
    }).toThrow("Invalid RRULE options");
  });
});
