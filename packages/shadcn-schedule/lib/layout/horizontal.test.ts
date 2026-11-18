import { describe, expect, it } from "vitest";

import { layoutHorizontal } from "@/lib/layout/horizontal";
import { elementAt } from "@/test-utils/element-at";
import type { CalendarEvent } from "@/types/index";
import { toISOString, toZonedDateTime } from "@/utils/temporal";

const days = Array.from({ length: 7 }, (_, i) =>
  toZonedDateTime("2025-01-12T00:00:00.000Z").add({ days: i })
);

// Compact event factory: id doubles as title.
const mkEvent = (
  id: string,
  startISO: string,
  endISO: string
): CalendarEvent => ({
  id,
  end: toZonedDateTime(endISO),
  start: toZonedDateTime(startISO),
  title: id,
});

const singleDayEvent = mkEvent(
  "single-day",
  "2025-01-13T10:00:00.000Z",
  "2025-01-13T11:00:00.000Z"
);

const multiDayEvent = mkEvent(
  "multi-day",
  "2025-01-13T00:00:00.000Z",
  "2025-01-15T23:59:59.000Z"
);

const longMultiDayEvent = mkEvent(
  "long-multi-day",
  "2025-01-10T00:00:00.000Z",
  "2025-01-20T23:59:59.000Z"
);

// Run layout with the default 7-day grid and dayMaxEvents 4.
const run = (
  events: CalendarEvent[],
  opts: {
    dayMaxEvents?: number;
    days?: typeof days;
    gridType?: "day" | "hour";
  } = {}
) =>
  layoutHorizontal({
    events,
    dayMaxEvents: opts.dayMaxEvents ?? 4,
    days: opts.days ?? days,
    gridType: opts.gridType,
  });

const runLongMultiDay = () => run([longMultiDayEvent]);

describe(layoutHorizontal, () => {
  describe("Basic Positioning", () => {
    it("positions single-day event correctly", () => {
      const result = run([singleDayEvent]);

      expect(result).toHaveLength(1);
      const p = elementAt(result, 0);
      expect(p.left).toBeCloseTo(14.285714, 2);
      expect(p.width).toBeCloseTo(14.285714, 2);
      expect(p.row).toBe(0);
    });

    it("positions multi-day event correctly", () => {
      const result = run([multiDayEvent]);

      expect(result).toHaveLength(1);
      const p = elementAt(result, 0);
      expect(p.left).toBeCloseTo(14.285714, 2);
      expect(p.width).toBeCloseTo(42.857142, 2);
      expect(p.row).toBe(0);
    });

    it("emits horizontal-kind placements — the renderer derives pixels from row", () => {
      const p = elementAt(run([singleDayEvent]), 0);
      expect(p.kind).toBe("horizontal");
    });

    it("nests the original event by reference, un-mutated and un-copied", () => {
      const p = elementAt(run([singleDayEvent]), 0);
      expect(p.event).toBe(singleDayEvent);
    });
  });

  describe("Edge Cases - Truncation", () => {
    // Lay out the week-spanning event. Length is asserted by the callers so
    // the check always runs inside a test.

    it("truncates event starting before week start", () => {
      const result = runLongMultiDay();
      expect(result).toHaveLength(1);
      const p = elementAt(result, 0);
      expect(p.left).toBe(0);
      expect(p.isTruncatedStart).toBeTruthy();
    });

    it("truncates event ending after week end", () => {
      const result = run([
        mkEvent(
          "multi-day",
          "2025-01-16T00:00:00.000Z",
          "2025-01-20T23:59:59.000Z"
        ),
      ]);

      expect(result).toHaveLength(1);
      expect(result.at(0)?.isTruncatedEnd).toBeTruthy();
    });

    it("truncates event spanning entire week and beyond", () => {
      const result = runLongMultiDay();
      expect(result).toHaveLength(1);
      const p = elementAt(result, 0);
      expect(p.left).toBe(0);
      expect(p.width).toBe(100);
      expect(p.isTruncatedStart).toBeTruthy();
      expect(p.isTruncatedEnd).toBeTruthy();
    });
  });

  describe("Edge Cases - Grid Bounds", () => {
    it("clamps single-day event at last day boundary", () => {
      const result = run([
        mkEvent(
          "single-day",
          "2025-01-18T23:00:00.000Z",
          "2025-01-18T23:59:59.000Z"
        ),
      ]);

      expect(result).toHaveLength(1);
      expect(result.at(0)?.left).toBeCloseTo(85.714285, 2);
    });

    it("handles events exactly at week boundaries", () => {
      const result = run([
        mkEvent(
          "first",
          "2025-01-12T00:00:00.000Z",
          "2025-01-12T23:59:59.000Z"
        ),
        mkEvent("last", "2025-01-18T00:00:00.000Z", "2025-01-18T23:59:59.000Z"),
      ]);

      expect(result).toHaveLength(2);
      const first = elementAt(result, 0);
      const last = elementAt(result, 1);
      expect(first.left).toBe(0);
      expect(last.left).toBeCloseTo(85.714285, 2);
    });
  });

  describe("Complex Scenarios - Overlapping Events", () => {
    it("stacks overlapping single-day events vertically", () => {
      const result = run([
        singleDayEvent,
        mkEvent(
          "single-2",
          "2025-01-13T11:00:00.000Z",
          "2025-01-13T11:30:00.000Z"
        ),
        mkEvent(
          "single-3",
          "2025-01-13T14:00:00.000Z",
          "2025-01-13T14:30:00.000Z"
        ),
      ]);

      expect(result.map((p) => p.row)).toStrictEqual([0, 1, 2]);
    });

    it("stacks overlapping multi-day events correctly", () => {
      const result = run([
        multiDayEvent,
        mkEvent(
          "multi-2",
          "2025-01-14T00:00:00.000Z",
          "2025-01-16T23:59:59.000Z"
        ),
      ]);

      expect(result.map((p) => p.row)).toStrictEqual([0, 1]);
    });

    it("sorts multi-day events by duration (longer first)", () => {
      const result = run([
        mkEvent(
          "short",
          "2025-01-13T00:00:00.000Z",
          "2025-01-14T23:59:59.000Z"
        ),
        mkEvent("long", "2025-01-13T00:00:00.000Z", "2025-01-16T23:59:59.000Z"),
      ]);

      expect(result.map((p) => p.event.id)).toStrictEqual(["long", "short"]);
    });
  });

  describe("Complex Scenarios - Gap Filling", () => {
    it("fills gaps with single-day events", () => {
      const result = run([
        multiDayEvent,
        mkEvent(
          "gap-filler",
          "2025-01-16T10:00:00.000Z",
          "2025-01-16T11:00:00.000Z"
        ),
      ]);

      expect(result.map((p) => p.row)).toStrictEqual([0, 0]);
    });

    it("places non-overlapping events in same row", () => {
      const result = run([
        multiDayEvent,
        mkEvent(
          "multi-2",
          "2025-01-17T00:00:00.000Z",
          "2025-01-18T23:59:59.000Z"
        ),
      ]);

      expect(result.map((p) => p.row)).toStrictEqual([0, 0]);
    });
  });

  describe("Grid Overflow Handling", () => {
    it("stops placing events when dayMaxEvents is reached", () => {
      const manyEvents = Array.from({ length: 10 }, (_, i) =>
        mkEvent(
          `event-${i}`,
          toISOString(
            toZonedDateTime("2025-01-13T10:00:00.000Z").add({ hours: i })
          ),
          toISOString(
            toZonedDateTime("2025-01-13T11:00:00.000Z").add({ hours: i })
          )
        )
      );

      const result = run(manyEvents, { dayMaxEvents: 3 });

      expect(result).toHaveLength(3);
      expect(result.map((p) => p.event.id)).toStrictEqual([
        "event-0",
        "event-1",
        "event-2",
      ]);
      expect(result.map((p) => p.row)).toStrictEqual([0, 1, 2]);
    });

    it("tries to place truncated version if full event does not fit", () => {
      const fillerEvents = [0, 1, 2].map((i) =>
        mkEvent(
          `filler-${i}`,
          "2025-01-13T00:00:00.000Z",
          "2025-01-15T23:59:59.000Z"
        )
      );

      const result = run(fillerEvents, { dayMaxEvents: 2 });

      expect(result).toHaveLength(2);
    });

    it("respects dayMaxEvents limit when placing overlapping events", () => {
      const blockerEvents = [0, 1, 2].map((i) =>
        mkEvent(
          `blocker-${i}`,
          "2025-01-13T00:00:00.000Z",
          "2025-01-15T23:59:59.000Z"
        )
      );

      const result = run(blockerEvents, { dayMaxEvents: 2 });

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.row)).toStrictEqual([0, 1]);
    });
  });

  describe("Hour Grid Type", () => {
    // Real hour grid: the 24 hours of one day (the resource day/week views
    // pass a day's hours, not seven days).
    const hourDays = Array.from({ length: 24 }, (_, i) =>
      toZonedDateTime("2025-01-13T00:00:00.000Z").add({ hours: i })
    );

    it("positions sub-hour events at minute precision", () => {
      const result = run(
        [
          mkEvent(
            "half",
            "2025-01-13T10:30:00.000Z",
            "2025-01-13T12:00:00.000Z"
          ),
        ],
        { days: hourDays, gridType: "hour" }
      );

      expect(result).toHaveLength(1);
      const p = elementAt(result, 0);
      // 10:30 → 43.75% of the day; 1.5h → 6.25% width.
      expect(p.left).toBeCloseTo(43.75, 5);
      expect(p.width).toBeCloseTo(6.25, 5);
      expect(p.row).toBe(0);
    });

    it("keeps back-to-back events on the same row", () => {
      const result = run(
        [
          mkEvent(
            "first",
            "2025-01-13T10:00:00.000Z",
            "2025-01-13T11:30:00.000Z"
          ),
          mkEvent(
            "second",
            "2025-01-13T11:30:00.000Z",
            "2025-01-13T13:00:00.000Z"
          ),
        ],
        { days: hourDays, gridType: "hour" }
      );

      expect(result.map((p) => p.row)).toStrictEqual([0, 0]);
    });

    it("clamps events that start before the visible hours", () => {
      // Grid shows 10:00-22:00 (business hours).
      const businessDays = hourDays.slice(10, 22);

      const result = run(
        [
          mkEvent(
            "early",
            "2025-01-13T09:30:00.000Z",
            "2025-01-13T11:00:00.000Z"
          ),
        ],
        { days: businessDays, gridType: "hour" }
      );

      expect(result).toHaveLength(1);
      const p = elementAt(result, 0);
      expect(p.left).toBe(0);
      expect(p.isTruncatedStart).toBeTruthy();
      // The visible part is 10:00-11:00: 60 of 720 minutes.
      expect(p.width).toBeCloseTo((60 / 720) * 100, 5);
    });

    it("skips events whose visible part lies entirely before the grid", () => {
      // Grid shows 10:00-22:00; the booking's after-midnight tail
      // (00:00-01:00) precedes the opening hour.
      const businessDays = hourDays.slice(10, 22);

      const result = run(
        [
          mkEvent(
            "overnight-tail",
            "2025-01-12T23:30:00.000Z",
            "2025-01-13T01:00:00.000Z"
          ),
        ],
        { days: businessDays, gridType: "hour" }
      );

      expect(result).toHaveLength(0);
    });

    it("clamps events that end after the visible hours", () => {
      const businessDays = hourDays.slice(10, 22);

      const result = run(
        [
          mkEvent(
            "late",
            "2025-01-13T21:30:00.000Z",
            "2025-01-13T23:30:00.000Z"
          ),
        ],
        { days: businessDays, gridType: "hour" }
      );

      expect(result).toHaveLength(1);
      const p = elementAt(result, 0);
      expect(p.isTruncatedEnd).toBeTruthy();
      // The visible part is 21:30-22:00: 30 of the grid's 720 minutes.
      expect(p.left).toBeCloseTo((690 / 720) * 100, 5);
      expect(p.width).toBeCloseTo((30 / 720) * 100, 5);
    });
  });
});

describe("wrapped overnight grid", () => {
  // Business hours 13:00 → 01:00. The hour columns run 13..23 and then the
  // next day's 00:00, the shape `getViewHours` produces for an overnight
  // window.
  const overnightDays = [
    ...Array.from({ length: 11 }, (_, index) =>
      toZonedDateTime("2025-01-13T13:00:00.000Z").add({ hours: index })
    ),
    toZonedDateTime("2025-01-14T00:00:00.000Z"),
  ];

  const crossesMidnight = mkEvent(
    "crosses-midnight",
    "2025-01-13T23:30:00.000Z",
    "2025-01-14T00:45:00.000Z"
  );

  it("places an event that crosses midnight instead of dropping it", () => {
    const result = run([crossesMidnight], {
      days: overnightDays,
      gridType: "hour",
    });

    expect(result).toHaveLength(1);
  });

  it("flows the event from its 23:30 column into the tail column", () => {
    const result = run([crossesMidnight], {
      days: overnightDays,
      gridType: "hour",
    });

    const placed = elementAt(result, 0);

    // 23:30 is 630 minutes into a 720-minute grid.
    expect(placed.left).toBeCloseTo((630 / 720) * 100, 5);
    expect(placed.width).toBeGreaterThan((60 / 720) * 100);
    expect(placed.isTruncatedStart).toBeFalsy();
  });
});
