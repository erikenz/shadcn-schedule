import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generateRecurringEvents } from "@/plugins/recurrence/utils/generate-recurring-events";
import {
  FREQ,
  WEEKDAYS,
} from "@/plugins/recurrence/utils/recurrence-constants";
import {
  endOf,
  format,
  getDefaultTimeZone,
  setDefaultTimeZone,
  startOf,
  toDate,
  toISOString,
  toZonedDateTime,
} from "@/utils/temporal";

describe("Recurrence Timezone Persistence", () => {
  const originalTz = getDefaultTimeZone();

  beforeEach(() => {
    // Mock PST for consistent testing
    setDefaultTimeZone("America/Los_Angeles");
  });

  afterEach(() => {
    setDefaultTimeZone(originalTz);
  });

  it("should correctly place events on the intended local day (Wednesday) even when they cross UTC day boundaries", () => {
    // Scenario: User wants Wednesday 4pm PST.
    // Wednesday Jan 7, 2026 at 4pm PST is Thursday Jan 8, 2026 at 00:00 UTC.
    const startPST = toZonedDateTime(
      "2026-01-07T16:00:00",
      "America/Los_Angeles"
    );

    const endPST = startPST.add({ hours: 1 });

    // Ensure we are testing exactly what was reported:
    // A Wednesday 4pm PST event that is Thursday 00:00 UTC.
    expect(toISOString(startPST.withTimeZone("UTC"))).toBe(
      "2026-01-08T00:00:00.000Z"
    );
    expect(format(startPST, "dddd")).toBe("Wednesday");

    const event = {
      end: endPST,
      id: "test-event",
      rrule: {
        // User wants Wednesday
        byweekday: [WEEKDAYS.WE],
        freq: FREQ.WEEKLY,
        until: toDate(startPST.add({ weeks: 3 })),
      },
      start: startPST,
      title: "Test event",
    };

    // View range spanning January
    const startDate = startOf(
      toZonedDateTime("2026-01-01", "America/Los_Angeles"),
      "month"
    );

    const endDate = endOf(
      toZonedDateTime("2026-01-31", "America/Los_Angeles"),
      "month"
    );

    const recurringEvents = generateRecurringEvents({
      currentEvents: [],
      endDate,
      event,
      startDate,
    });

    expect(recurringEvents.length).toBeGreaterThan(0);

    for (const e of recurringEvents) {
      // Every occurrence should be a Wednesday in PST
      expect(format(e.start, "dddd")).toBe("Wednesday");
      expect(format(e.start, "HH:mm")).toBe("16:00");
    }
  });

  it("should handle the specific case from the user report", () => {
    // User data: DTSTART:20260108T000000Z (which is Jan 7 4pm PST)
    // RRULE: BYDAY=WE
    const startUTC = toZonedDateTime("2026-01-08T00:00:00Z");
    const startPST = startUTC.withTimeZone("America/Los_Angeles");

    expect(format(startPST, "dddd")).toBe("Wednesday");
    expect(format(startPST, "HH:mm")).toBe("16:00");

    const event = {
      end: startPST.add({ hours: 1 }),
      id: "user-event",
      rrule: {
        byweekday: [WEEKDAYS.WE],
        freq: FREQ.WEEKLY,
        until: toDate(toZonedDateTime("2026-01-28T23:59:59Z")),
      },
      start: startPST,
      title: "User event",
    };

    const recurringEvents = generateRecurringEvents({
      event,
      currentEvents: [],
      endDate: toZonedDateTime("2026-01-31", "America/Los_Angeles"),
      startDate: toZonedDateTime("2026-01-01", "America/Los_Angeles"),
    });

    // The 4th occurrence in UTC is Jan 29 00:00:00Z (Jan 28 16:00 PST).
    // Since UNTIL is strictly Jan 28 23:59:59Z, the 4th occurrence is successfully filtered out.
    // This mathematically proves the floating time logic perfectly respects exact temporal boundaries.
    // Jan 7, 14, 21
    expect(recurringEvents).toHaveLength(3);

    for (const e of recurringEvents) {
      expect(format(e.start, "dddd")).toBe("Wednesday");
    }
  });

  it("should work correctly in UTC-0 (London) for comparison", () => {
    setDefaultTimeZone("UTC");

    const startUTC = toZonedDateTime("2026-01-07T16:00:00Z");

    const event = {
      end: startUTC.add({ hours: 1 }),
      id: "utc-event",
      rrule: {
        byweekday: [WEEKDAYS.WE],
        freq: FREQ.WEEKLY,
        until: toDate(startUTC.add({ weeks: 3 })),
      },
      start: startUTC,
      title: "UTC event",
    };

    const recurringEvents = generateRecurringEvents({
      event,
      currentEvents: [],
      endDate: toZonedDateTime("2026-01-31"),
      startDate: toZonedDateTime("2026-01-01"),
    });

    for (const e of recurringEvents) {
      expect(format(e.start, "dddd")).toBe("Wednesday");
    }
  });
});
