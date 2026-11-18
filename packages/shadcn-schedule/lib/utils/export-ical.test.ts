import { describe, expect, it } from "vitest";

import { exportToICalendar } from "@/lib/utils/export-ical";
import { recurrenceICalProperties } from "@/plugins/recurrence/index";
import {
  FREQ,
  WEEKDAYS,
} from "@/plugins/recurrence/utils/recurrence-constants";
import { elementAt } from "@/test-utils/element-at";
import type { CalendarEvent } from "@/types/index";
import { toDate, toZonedDateTime } from "@/utils/temporal";

// Regexes asserted against the exported iCal text, hoisted to module scope
// so they are compiled once per module load.
const VCALENDAR_START = /^BEGIN:VCALENDAR/u;
const VCALENDAR_END = /END:VCALENDAR\s*$/u;
const BYDAY_MO = /BYDAY=.*MO/u;
const BYDAY_WE = /BYDAY=.*WE/u;
const BYDAY_FR = /BYDAY=.*FR/u;

// No-op collect for tests asserting only core fields.
const noCollect = (): unknown[] => [];

// collect backed by the recurrence plugin's iCal contribution, for tests that
// assert RRULE / EXDATE / RECURRENCE-ID lines.
const recurrenceCollect = (point: string, event: CalendarEvent): unknown[] =>
  point === "ical:vevent-properties" ? recurrenceICalProperties(event) : [];

// Helper to create minimal valid event
const createEvent = (
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  end: toZonedDateTime("2025-08-04T10:00:00.000Z"),
  id: "test-event",
  start: toZonedDateTime("2025-08-04T09:00:00.000Z"),
  title: "Test Event",
  ...overrides,
});

// Helper to extract VEVENT content from iCal
const extractVEvent = (ical: string, index = 0): string => {
  const matches = ical.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/gu);

  return matches?.[index] ?? "";
};

describe("iCalendar Export", () => {
  const sampleEvents: CalendarEvent[] = [
    {
      description: "A simple test meeting",
      end: toZonedDateTime("2025-08-04T10:00:00.000Z"),
      id: "simple-1",
      location: "Conference Room A",
      start: toZonedDateTime("2025-08-04T09:00:00.000Z"),
      title: "Simple Meeting",
      uid: "simple-1@calendar.local",
    },
    {
      description: "Team standup meeting",
      end: toZonedDateTime("2025-08-04T14:30:00.000Z"),
      id: "recurring-1",
      rrule: {
        byweekday: [WEEKDAYS.MO],
        dtstart: toDate(toZonedDateTime("2025-08-04T14:00:00.000Z")),
        freq: FREQ.WEEKLY,
        interval: 1,
      },
      start: toZonedDateTime("2025-08-04T14:00:00.000Z"),
      title: "Weekly Standup",
      uid: "recurring-1@calendar.local",
    },
    {
      allDay: true,
      end: toZonedDateTime("2025-12-26T00:00:00.000Z"),
      id: "all-day-1",
      start: toZonedDateTime("2025-12-25T00:00:00.000Z"),
      title: "Company Holiday",
      uid: "all-day-1@calendar.local",
    },
  ];

  it("should generate valid iCalendar header and footer", () => {
    const ical = exportToICalendar(sampleEvents, noCollect);

    expect(ical).toContain("BEGIN:VCALENDAR");
    expect(ical).toContain("VERSION:2.0");
    expect(ical).toContain("PRODID:-//shadcn-schedule//Calendar//EN");
    expect(ical).toContain("END:VCALENDAR");
  });

  it("should export simple event metadata", () => {
    const ical = exportToICalendar([elementAt(sampleEvents, 0)], noCollect);

    expect(ical).toContain("UID:simple-1@calendar.local");
    expect(ical).toContain("SUMMARY:Simple Meeting");
    expect(ical).toContain("DESCRIPTION:A simple test meeting");
    expect(ical).toContain("LOCATION:Conference Room A");
  });

  it("should export simple event timings and boundaries", () => {
    const ical = exportToICalendar([elementAt(sampleEvents, 0)], noCollect);

    expect(ical).toContain("BEGIN:VEVENT");
    expect(ical).toContain("DTSTART:20250804T090000Z");
    expect(ical).toContain("DTEND:20250804T100000Z");
    expect(ical).toContain("END:VEVENT");
  });

  it("should export recurring events with RRULE", () => {
    const ical = exportToICalendar(
      [elementAt(sampleEvents, 1)],
      recurrenceCollect
    );

    expect(ical).toContain("UID:recurring-1@calendar.local");
    expect(ical).toContain("SUMMARY:Weekly Standup");
    expect(ical).toContain("RRULE:");
    expect(ical).toContain("FREQ=WEEKLY");
  });

  it("should export all-day events correctly", () => {
    const ical = exportToICalendar([elementAt(sampleEvents, 2)], noCollect);

    expect(ical).toContain("UID:all-day-1@calendar.local");
    expect(ical).toContain("SUMMARY:Company Holiday");
    expect(ical).toContain("DTSTART;VALUE=DATE:20251225");
    expect(ical).toContain("DTEND;VALUE=DATE:20251226");
  });

  it("should export multiple events", () => {
    const ical = exportToICalendar(sampleEvents, noCollect);

    // Should contain all three events
    const eventCount = (ical.match(/BEGIN:VEVENT/gu) ?? []).length;
    expect(eventCount).toBe(3);

    expect(ical).toContain("simple-1@calendar.local");
    expect(ical).toContain("recurring-1@calendar.local");
    expect(ical).toContain("all-day-1@calendar.local");
  });

  it("should escape special characters in text fields", () => {
    const eventWithSpecialChars: CalendarEvent = {
      description: "Description with\nnewlines and; semicolons, commas",
      end: toZonedDateTime("2025-08-04T10:00:00.000Z"),
      id: "special-1",
      start: toZonedDateTime("2025-08-04T09:00:00.000Z"),
      title: "Meeting; with, special\\ncharacters",
      uid: "special-1@calendar.local",
    };

    const ical = exportToICalendar([eventWithSpecialChars], noCollect);

    expect(ical).toContain("SUMMARY:Meeting\\; with\\, special\\\\ncharacters");
    expect(ical).toContain(
      "DESCRIPTION:Description with\\nnewlines and\\; semicolons\\, commas"
    );
  });

  it("should handle events with EXDATE", () => {
    const eventWithExdates: CalendarEvent = {
      end: toZonedDateTime("2025-08-04T10:00:00.000Z"),
      exdates: ["2025-08-05T09:00:00.000Z", "2025-08-07T09:00:00.000Z"],
      id: "exdate-1",
      rrule: {
        dtstart: toDate(toZonedDateTime("2025-08-04T09:00:00.000Z")),
        freq: FREQ.DAILY,
        interval: 1,
      },
      start: toZonedDateTime("2025-08-04T09:00:00.000Z"),
      title: "Recurring with Exceptions",
      uid: "exdate-1@calendar.local",
    };

    const ical = exportToICalendar([eventWithExdates], recurrenceCollect);

    expect(ical).toContain("RRULE:");
    expect(ical).toContain("EXDATE:20250805T090000Z,20250807T090000Z");
  });

  it("should handle events with recurrenceId (modified instances)", () => {
    const modifiedInstance: CalendarEvent = {
      end: toZonedDateTime("2025-08-04T11:00:00.000Z"),
      id: "modified-1",
      recurrenceId: "2025-08-04T09:00:00.000Z",
      start: toZonedDateTime("2025-08-04T10:00:00.000Z"),
      title: "Modified Instance",
      uid: "recurring-1@calendar.local",
    };

    const ical = exportToICalendar([modifiedInstance], recurrenceCollect);

    expect(ical).toContain("RECURRENCE-ID:20250804T090000Z");
    expect(ical).toContain("UID:recurring-1@calendar.local");
  });

  it("should include timezone information", () => {
    const ical = exportToICalendar(sampleEvents, noCollect);

    expect(ical).toContain("BEGIN:VTIMEZONE");
    expect(ical).toContain("TZID:UTC");
    expect(ical).toContain("END:VTIMEZONE");
  });

  it("should serialize every event passed in (exporter no longer filters)", () => {
    // The core exporter is recurrence-agnostic and runs on raw events, which
    // never contain generated instances, so no filtering happens — each event
    // in the array becomes exactly one VEVENT.
    const events: CalendarEvent[] = [
      {
        end: toZonedDateTime("2025-01-15T11:00:00"),
        id: "recurring-base",
        rrule: {
          byweekday: [WEEKDAYS.MO],
          dtstart: toDate(toZonedDateTime("2025-01-15T10:00:00")),
          freq: FREQ.WEEKLY,
          interval: 1,
        },
        start: toZonedDateTime("2025-01-15T10:00:00"),
        title: "Weekly Meeting",
        uid: "weekly-meeting@calendar.com",
      },
      {
        end: toZonedDateTime("2025-01-29T15:00:00"),
        id: "recurring-base_modified",
        recurrenceId: "2025-01-29T10:00:00.000Z",
        start: toZonedDateTime("2025-01-29T14:00:00"),
        title: "Modified Weekly Meeting",
        uid: "weekly-meeting@calendar.com",
      },
      {
        end: toZonedDateTime("2025-01-16T16:00:00"),
        id: "single-event",
        start: toZonedDateTime("2025-01-16T15:00:00"),
        title: "One-time Meeting",
      },
    ];

    const ical = exportToICalendar(events, recurrenceCollect);

    // Every event becomes one VEVENT — three in, three out.
    const eventCount = (ical.match(/BEGIN:VEVENT/gu) ?? []).length;
    expect(eventCount).toBe(3);

    // Base recurring event with RRULE contributed by recurrence.
    expect(ical).toContain("UID:weekly-meeting@calendar.com");
    expect(ical).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO");

    // Modified instance with RECURRENCE-ID contributed by recurrence.
    expect(ical).toContain("RECURRENCE-ID:20250129T100000Z");
    expect(ical).toContain("SUMMARY:Modified Weekly Meeting");
  });

  it("exports standalone events in the same calendar", () => {
    const singleEvent: CalendarEvent = {
      end: toZonedDateTime("2025-01-16T16:00:00"),
      id: "single-event",
      start: toZonedDateTime("2025-01-16T15:00:00"),
      title: "One-time Meeting",
    };

    const ical = exportToICalendar([singleEvent], recurrenceCollect);
    expect(ical).toContain("UID:single-event@calendar.local");
    expect(ical).toContain("SUMMARY:One-time Meeting");
  });
});

describe("RFC 5545 Compliance", () => {
  it("should use CRLF line endings as per RFC 5545", () => {
    const ical = exportToICalendar([createEvent()], noCollect);
    // RFC 5545 requires CRLF (\r\n) line endings
    expect(ical).toContain("\r\n");
    // Should not have bare LF
    expect(ical.split("\r\n").length).toBeGreaterThan(10);
  });

  it("should include required VCALENDAR framing and calendar properties", () => {
    const ical = exportToICalendar([createEvent()], noCollect);
    expect(ical).toMatch(VCALENDAR_START);
    expect(ical).toContain("VERSION:2.0");
    expect(ical).toContain("PRODID:");
    expect(ical).toContain("CALSCALE:GREGORIAN");
    expect(ical).toMatch(VCALENDAR_END);
  });

  it("should declare METHOD:PUBLISH for standalone exports", () => {
    const ical = exportToICalendar([createEvent()], noCollect);
    expect(ical).toContain("METHOD:PUBLISH");
  });

  it("should include required VEVENT properties", () => {
    const ical = exportToICalendar(
      [createEvent({ uid: "test-uid@example.com" })],
      noCollect
    );

    const vevent = extractVEvent(ical);

    expect(vevent).toContain("UID:test-uid@example.com");
    expect(vevent).toContain("DTSTART:");
    expect(vevent).toContain("DTEND:");
    expect(vevent).toContain("DTSTAMP:");
    expect(vevent).toContain("SUMMARY:");
  });

  it("should format UTC dates correctly (YYYYMMDDTHHMMSSZ)", () => {
    const event = createEvent({
      end: toZonedDateTime("2025-08-04T10:45:00.000Z"),
      start: toZonedDateTime("2025-08-04T09:30:00.000Z"),
    });

    const ical = exportToICalendar([event], noCollect);

    expect(ical).toContain("DTSTART:20250804T093000Z");
    expect(ical).toContain("DTEND:20250804T104500Z");
  });

  it("should format all-day dates correctly (YYYYMMDD with VALUE=DATE)", () => {
    const event = createEvent({
      allDay: true,
      end: toZonedDateTime("2025-08-05T00:00:00.000Z"),
      start: toZonedDateTime("2025-08-04T00:00:00.000Z"),
    });

    const ical = exportToICalendar([event], noCollect);

    expect(ical).toContain("DTSTART;VALUE=DATE:20250804");
    expect(ical).toContain("DTEND;VALUE=DATE:20250805");
  });
});

describe("Text Escaping (RFC 5545 Section 3.3.11)", () => {
  it.each([
    ["Path with\\backslash", "SUMMARY:Path with\\\\backslash"],
    ["Meeting; Important", "SUMMARY:Meeting\\; Important"],
    ["Review: A, B, C", "SUMMARY:Review: A\\, B\\, C"],
  ])("escapes %j in the summary line", (title, expected) => {
    const event = createEvent({ title });
    const ical = exportToICalendar([event], noCollect);
    expect(ical).toContain(expected);
  });

  it("should escape newlines as \\n", () => {
    const event = createEvent({ description: "Line 1\nLine 2\nLine 3" });
    const ical = exportToICalendar([event], noCollect);
    expect(ical).toContain("DESCRIPTION:Line 1\\nLine 2\\nLine 3");
  });

  it("should remove carriage returns", () => {
    const event = createEvent({ description: "Text\r\nwith\r\nCRLF" });
    const ical = exportToICalendar([event], noCollect);
    // \r should be removed, \n should be escaped
    expect(ical).toContain("DESCRIPTION:Text\\nwith\\nCRLF");
  });

  it("should handle all special characters together", () => {
    const event = createEvent({
      description: "More; commas, here\nand lines",
      location: "Room A; Floor 2, Building",
      title: "Test; with, special\nchars",
    });

    const ical = exportToICalendar([event], noCollect);

    // Verify semicolons, commas, and newlines are escaped
    expect(ical).toContain("SUMMARY:Test\\; with\\, special\\nchars");
    expect(ical).toContain("DESCRIPTION:More\\; commas\\, here\\nand lines");
    expect(ical).toContain("LOCATION:Room A\\; Floor 2\\, Building");
  });
});

describe("UID Generation", () => {
  it("should use existing uid if provided", () => {
    const event = createEvent({ uid: "custom-uid@my-domain.com" });
    const ical = exportToICalendar([event], noCollect);
    expect(ical).toContain("UID:custom-uid@my-domain.com");
  });

  it("should generate UID from id if uid not provided", () => {
    const event = createEvent({ id: "my-event-123" });
    const ical = exportToICalendar([event], noCollect);
    expect(ical).toContain("UID:my-event-123@calendar.local");
  });

  it("should generate unique UIDs for different events", () => {
    const events = [
      createEvent({ id: "event-1" }),
      createEvent({ id: "event-2" }),
      createEvent({ id: "event-3" }),
    ];

    const ical = exportToICalendar(events, noCollect);

    expect(ical).toContain("UID:event-1@calendar.local");
    expect(ical).toContain("UID:event-2@calendar.local");
    expect(ical).toContain("UID:event-3@calendar.local");
  });
});

describe("RRULE Formatting", () => {
  it("should format daily recurrence", () => {
    const event = createEvent({
      rrule: {
        dtstart: toDate(toZonedDateTime("2025-08-04T09:00:00.000Z")),
        freq: FREQ.DAILY,
        interval: 1,
      },
    });

    const ical = exportToICalendar([event], recurrenceCollect);
    expect(ical).toContain("RRULE:FREQ=DAILY");
  });

  it("should format weekly recurrence frequency and interval", () => {
    const event = createEvent({
      rrule: {
        byweekday: [WEEKDAYS.MO, WEEKDAYS.WE, WEEKDAYS.FR],
        dtstart: toDate(toZonedDateTime("2025-08-04T09:00:00.000Z")),
        freq: FREQ.WEEKLY,
        interval: 2,
      },
    });

    const ical = exportToICalendar([event], recurrenceCollect);
    expect(ical).toContain("RRULE:");
    expect(ical).toContain("FREQ=WEEKLY");
    expect(ical).toContain("INTERVAL=2");
  });

  it("should format weekly recurrence with specific days", () => {
    const event = createEvent({
      rrule: {
        byweekday: [WEEKDAYS.MO, WEEKDAYS.WE, WEEKDAYS.FR],
        dtstart: toDate(toZonedDateTime("2025-08-04T09:00:00.000Z")),
        freq: FREQ.WEEKLY,
        interval: 2,
      },
    });

    const ical = exportToICalendar([event], recurrenceCollect);
    expect(ical).toMatch(BYDAY_MO);
    expect(ical).toMatch(BYDAY_WE);
    expect(ical).toMatch(BYDAY_FR);
  });

  it("should format monthly recurrence", () => {
    const event = createEvent({
      rrule: {
        dtstart: toDate(toZonedDateTime("2025-08-04T09:00:00.000Z")),
        freq: FREQ.MONTHLY,
        interval: 1,
      },
    });

    const ical = exportToICalendar([event], recurrenceCollect);
    expect(ical).toContain("RRULE:FREQ=MONTHLY");
  });

  it("should format recurrence with count", () => {
    const event = createEvent({
      rrule: {
        count: 10,
        dtstart: toDate(toZonedDateTime("2025-08-04T09:00:00.000Z")),
        freq: FREQ.DAILY,
        interval: 1,
      },
    });

    const ical = exportToICalendar([event], recurrenceCollect);
    expect(ical).toContain("RRULE:");
    expect(ical).toContain("COUNT=10");
  });

  it("should format recurrence with until date", () => {
    const event = createEvent({
      rrule: {
        dtstart: toDate(toZonedDateTime("2025-08-04T09:00:00.000Z")),
        freq: FREQ.DAILY,
        interval: 1,
        until: toDate(toZonedDateTime("2025-12-31T23:59:59.000Z")),
      },
    });

    const ical = exportToICalendar([event], recurrenceCollect);
    expect(ical).toContain("RRULE:");
    expect(ical).toContain("UNTIL=");
  });

  it("should handle invalid rrule gracefully", () => {
    const event = createEvent();
    // Deliberately inject a malformed rrule (as if from an external source);
    // the exporter must not throw.
    Object.assign(event, { rrule: { invalid: "data" } });
    expect(() => exportToICalendar([event], recurrenceCollect)).not.toThrow();
  });
});

describe("Event Serialization", () => {
  it("should include base recurring events", () => {
    const baseEvent = createEvent({
      id: "recurring-base",
      rrule: { dtstart: new Date(), freq: FREQ.DAILY, interval: 1 },
      uid: "recurring@test.com",
    });

    const ical = exportToICalendar([baseEvent], recurrenceCollect);
    expect(extractVEvent(ical)).toContain("UID:recurring@test.com");
    expect(extractVEvent(ical)).toContain("RRULE:");
  });

  it("should include modified instances with recurrenceId", () => {
    const modifiedInstance = createEvent({
      id: "modified-instance",
      recurrenceId: "2025-08-04T09:00:00.000Z",
      uid: "recurring@test.com",
    });

    const ical = exportToICalendar([modifiedInstance], recurrenceCollect);
    expect(extractVEvent(ical)).toContain("RECURRENCE-ID:20250804T090000Z");
  });

  it("should include non-recurring events", () => {
    const singleEvent = createEvent({ id: "single", title: "Single Event" });
    const ical = exportToICalendar([singleEvent], noCollect);
    expect(extractVEvent(ical)).toContain("SUMMARY:Single Event");
  });

  it("should serialize one VEVENT per event with no filtering", () => {
    // The exporter no longer dedupes by UID — it runs on raw events that never
    // contain generated instances, so every event becomes its own VEVENT.
    const events = [
      createEvent({
        id: "base",
        rrule: { dtstart: new Date(), freq: FREQ.DAILY, interval: 1 },
        uid: "recurring@test.com",
      }),
      createEvent({ id: "second", uid: "second@test.com" }),
      createEvent({ id: "third", uid: "third@test.com" }),
    ];

    const ical = exportToICalendar(events, recurrenceCollect);

    const eventCount = (ical.match(/BEGIN:VEVENT/gu) ?? []).length;
    expect(eventCount).toBe(3);
  });
});

describe("Optional Fields", () => {
  it("should include description when provided", () => {
    const event = createEvent({ description: "Event description" });
    const ical = exportToICalendar([event], noCollect);
    expect(ical).toContain("DESCRIPTION:Event description");
  });

  it("should not include DESCRIPTION field when not provided", () => {
    const event = createEvent();
    const ical = exportToICalendar([event], noCollect);
    expect(ical).not.toContain("DESCRIPTION:");
  });

  it("should include location when provided", () => {
    const event = createEvent({ location: "Conference Room A" });
    const ical = exportToICalendar([event], noCollect);
    expect(ical).toContain("LOCATION:Conference Room A");
  });

  it("should not include LOCATION field when not provided", () => {
    const event = createEvent();
    const ical = exportToICalendar([event], noCollect);
    expect(ical).not.toContain("LOCATION:");
  });

  it("should include EXDATE when exdates provided", () => {
    const event = createEvent({
      exdates: ["2025-08-05T09:00:00.000Z", "2025-08-06T09:00:00.000Z"],
      rrule: { dtstart: new Date(), freq: FREQ.DAILY, interval: 1 },
    });

    const ical = exportToICalendar([event], recurrenceCollect);
    expect(ical).toContain("EXDATE:");
    expect(ical).toContain("20250805T090000Z");
    expect(ical).toContain("20250806T090000Z");
  });

  it("should not include EXDATE when exdates empty", () => {
    const event = createEvent({ exdates: [] });
    const ical = exportToICalendar([event], noCollect);
    expect(ical).not.toContain("EXDATE:");
  });
});

describe("Calendar Metadata", () => {
  it("should use default calendar name", () => {
    const ical = exportToICalendar([createEvent()], noCollect);
    expect(ical).toContain("X-WR-CALNAME:Calendar");
  });

  it("should use custom calendar name", () => {
    const ical = exportToICalendar(
      [createEvent()],
      noCollect,
      "My Custom Calendar"
    );

    expect(ical).toContain("X-WR-CALNAME:My Custom Calendar");
    expect(ical).toContain("X-WR-CALDESC:Exported from My Custom Calendar");
  });

  it("should escape special characters in calendar name", () => {
    const ical = exportToICalendar(
      [createEvent()],
      noCollect,
      "Work; Personal, Events"
    );

    expect(ical).toContain("X-WR-CALNAME:Work\\; Personal\\, Events");
  });
});

describe("Edge Cases", () => {
  it("should handle empty events array", () => {
    const ical = exportToICalendar([], noCollect);

    expect(ical).toContain("BEGIN:VCALENDAR");
    expect(ical).toContain("END:VCALENDAR");
    expect(ical).not.toContain("BEGIN:VEVENT");
  });

  it("should include required text fields for event with minimal fields", () => {
    const minimalEvent: CalendarEvent = {
      end: toZonedDateTime("2025-08-04T10:00:00.000Z"),
      id: "minimal",
      start: toZonedDateTime("2025-08-04T09:00:00.000Z"),
      title: "Minimal",
    };

    const ical = exportToICalendar([minimalEvent], noCollect);

    expect(ical).toContain("UID:minimal@calendar.local");
    expect(ical).toContain("SUMMARY:Minimal");
  });

  it("should include wrapper and timestamps for event with minimal fields", () => {
    const minimalEvent: CalendarEvent = {
      end: toZonedDateTime("2025-08-04T10:00:00.000Z"),
      id: "minimal",
      start: toZonedDateTime("2025-08-04T09:00:00.000Z"),
      title: "Minimal",
    };

    const ical = exportToICalendar([minimalEvent], noCollect);

    expect(ical).toContain("BEGIN:VEVENT");
    expect(ical).toContain("DTSTART:20250804T090000Z");
    expect(ical).toContain("DTEND:20250804T100000Z");
    expect(ical).toContain("END:VEVENT");
  });

  it("should handle event with empty title", () => {
    const event = createEvent({ title: "" });
    const ical = exportToICalendar([event], noCollect);
    expect(ical).toContain("SUMMARY:");
  });

  it("should handle event with very long title", () => {
    const longTitle = "A".repeat(200);
    const event = createEvent({ title: longTitle });
    const ical = exportToICalendar([event], noCollect);
    expect(ical).toContain(`SUMMARY:${longTitle}`);
  });

  it("should include standard VEVENT fields", () => {
    const event = createEvent();
    const ical = exportToICalendar([event], noCollect);
    const vevent = extractVEvent(ical);

    expect(vevent).toContain("STATUS:CONFIRMED");
    expect(vevent).toContain("SEQUENCE:0");
    expect(vevent).toContain("TRANSP:OPAQUE");
    expect(vevent).toContain("CREATED:");
    expect(vevent).toContain("LAST-MODIFIED:");
  });

  it("should handle large number of events", () => {
    const events = Array.from({ length: 100 }, (_, i) =>
      createEvent({ id: `event-${i}`, title: `Event ${i}` })
    );

    const ical = exportToICalendar(events, noCollect);

    const eventCount = (ical.match(/BEGIN:VEVENT/gu) ?? []).length;
    expect(eventCount).toBe(100);
  });
});
