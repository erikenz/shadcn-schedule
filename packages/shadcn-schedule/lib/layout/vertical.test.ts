import { describe, expect, it } from "vitest";

import { layoutVertical } from "@/lib/layout/vertical";
import { elementAt } from "@/test-utils/element-at";
import type { CalendarEvent } from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

// Default 24-hour grid anchored at 2025-01-13 00:00 UTC.
const BASE = "2025-01-13T00:00:00.000Z";

const hourDays = Array.from({ length: 24 }, (_, i) =>
  toZonedDateTime(BASE).add({ hours: i })
);

// at(h, m=0) → dayjs anchored BASE + h hours + m minutes.
// Negative or >24 hours crosses the day boundary for before/after-grid tests.
const at = (hour: number, minute = 0) =>
  toZonedDateTime(BASE).add({ minutes: hour * 60 + minute });

// Compact event factory: id, startHour, endHour, optional extras.
const mkEvent = (
  id: string,
  startH: number,
  endH: number,
  extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  end: at(endH),
  id,
  start: at(startH),
  title: id,
  ...extra,
});

// Run positioning with hourDays by default; allow overriding days/gridType.
const position = (
  events: CalendarEvent[],
  opts: {
    days?: typeof hourDays;
    eventOverlap?: boolean;
    gridType?: "day" | "hour" | "minute";
  } = {}
) =>
  layoutVertical({
    events,
    days: opts.days ?? hourDays,
    eventOverlap: opts.eventOverlap,
    gridType: opts.gridType,
  });

describe(layoutVertical, () => {
  describe("Input handling", () => {
    it("returns empty array when no events", () => {
      expect(position([])).toHaveLength(0);
    });

    it("filters out all-day events", () => {
      const result = position([
        mkEvent("all", 9, 10, { allDay: true }),
        mkEvent("timed", 9, 10),
      ]);

      expect(result.map((p) => p.event.id)).toStrictEqual(["timed"]);
    });

    it("returns empty when only all-day events", () => {
      expect(
        position([
          mkEvent("a", 9, 10, { allDay: true }),
          mkEvent("b", 9, 10, { allDay: true }),
        ])
      ).toHaveLength(0);
    });
  });

  describe("Single non-overlapping events", () => {
    it("emits one position with full width and no zIndex", () => {
      const p = elementAt(position([mkEvent("e", 9, 10)]), 0);
      expect(p.left).toBe(0);
      expect(p.width).toBe(100);
      expect(p.zIndex).toBeUndefined();
    });

    it("top/height reflect start/duration as percentage of grid", () => {
      const p = elementAt(position([mkEvent("e", 6, 9)]), 0);
      expect(p.top).toBeCloseTo((6 / 24) * 100, 5);
      expect(p.height).toBeCloseTo((3 / 24) * 100, 5);
    });

    it("splits non-overlapping events into separate clusters", () => {
      const result = position([mkEvent("a", 8, 9), mkEvent("b", 10, 11)]);
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.width === 100)).toBeTruthy();
      expect(result.every((e) => e.zIndex === undefined)).toBeTruthy();
    });

    it("back-to-back events (end === next start) are separate clusters", () => {
      // isSameOrAfter boundary: second event starts exactly when first ends.
      const result = position([mkEvent("a", 9, 10), mkEvent("b", 10, 11)]);
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.width === 100)).toBeTruthy();
    });
  });

  describe("Overlapping clusters (columns mode)", () => {
    it("2 events → equal columns [0, 50], zIndex 1 then 2", () => {
      const result = position([
        mkEvent("long", 9, 11),
        mkEvent("short", 9.5, 10),
      ]);

      expect(result.map((p) => p.event.id)).toStrictEqual(["long", "short"]);
      expect(result.map((e) => e.left)).toStrictEqual([0, 50]);
      expect(result.map((e) => e.width)).toStrictEqual([50, 50]);
      expect(result.map((e) => e.zIndex)).toStrictEqual([1, 2]);
    });

    it("3 events → thirds [0, 33.33, 66.67]", () => {
      const result = position([
        // 3h (longest)
        mkEvent("a", 9, 12),
        // 2h
        mkEvent("b", 9.5, 11.5),
        // 1h
        mkEvent("c", 10, 11),
      ]);

      expect(result.map((p) => p.event.id)).toStrictEqual(["a", "b", "c"]);
      expect(result.map((e) => e.left)).toStrictEqual([0, 100 / 3, 200 / 3]);
      expect(result.map((e) => e.width)).toStrictEqual([
        100 / 3,
        100 / 3,
        100 / 3,
      ]);
      expect(result.map((e) => e.zIndex)).toStrictEqual([1, 2, 3]);
    });

    it("4 events → quarters [0, 25, 50, 75]", () => {
      const result = position(
        [4, 3, 2, 1].map((hours, i) => mkEvent(`e${i}`, 9, 9 + hours))
      );

      expect(result.map((e) => e.left)).toStrictEqual([0, 25, 50, 75]);
      expect(result.map((e) => e.width)).toStrictEqual([25, 25, 25, 25]);
    });

    it("5 events → fifths [0, 20, 40, 60, 80]", () => {
      const result = position(
        [5, 4, 3, 2, 1].map((hours, i) => mkEvent(`e${i}`, 9, 9 + hours))
      );

      expect(result.map((e) => e.left)).toStrictEqual([0, 20, 40, 60, 80]);
    });
  });

  describe("Overlapping clusters (eventOverlap mode)", () => {
    it("stacks events full-width on top of each other", () => {
      const result = position(
        [mkEvent("long", 9, 11), mkEvent("short", 9.5, 10)],
        { eventOverlap: true }
      );

      expect(result.map((e) => e.left)).toStrictEqual([0, 0]);
      expect(result.map((e) => e.width)).toStrictEqual([100, 100]);
      expect(result.map((e) => e.zIndex)).toStrictEqual([1, 2]);
    });
  });

  describe("Sorting within cluster", () => {
    it("places longest-duration event first", () => {
      const result = position([
        mkEvent("short", 9.5, 10),
        mkEvent("long", 9, 11),
      ]);

      expect(result.map((p) => p.event.id)).toStrictEqual(["long", "short"]);
    });

    it("tie-breaks equal durations by earliest start", () => {
      const result = position([
        mkEvent("later", 9.5, 10.5),
        mkEvent("earlier", 9, 10),
      ]);

      expect(result.map((p) => p.event.id)).toStrictEqual(["earlier", "later"]);
    });
  });

  describe("Grid boundary clamping", () => {
    it("clamps event starting before grid to top=0", () => {
      // Starts at -2h (prev day 22:00), ends at +2h → 2 visible hours.
      const p = elementAt(position([mkEvent("e", -2, 2)]), 0);
      expect(p.top).toBe(0);
      expect(p.height).toBeCloseTo((2 / 24) * 100, 5);
    });

    it("clamps event ending after grid", () => {
      // Starts at 22h, ends at 26h (next day 02:00) → 2 visible hours.
      const p = elementAt(position([mkEvent("e", 22, 26)]), 0);
      expect(p.top).toBeCloseTo((22 / 24) * 100, 5);
      expect(p.height).toBeCloseTo((2 / 24) * 100, 5);
    });

    it("skips event entirely outside grid (zero duration after clamp)", () => {
      // Event entirely before grid: start=end=21:00 on prev day (-3h).
      expect(position([mkEvent("e", -3, -3)])).toHaveLength(0);
    });
  });

  describe("Discrete (day) grid", () => {
    const dayDays = Array.from({ length: 7 }, (_, i) =>
      toZonedDateTime(BASE).add({ days: i })
    );

    it("floors/ceils fractional day boundaries", () => {
      // start 6h (0.25d), end +42h (1.75d): floor→0, ceil→2. height = 2/7.
      const p = elementAt(
        position([mkEvent("e", 6, 42)], {
          days: dayDays,
          gridType: "day",
        }),
        0
      );

      expect(p.top).toBe(0);
      expect(p.height).toBeCloseTo((2 / 7) * 100, 5);
    });

    it("ensures at least 1 unit duration for discrete events", () => {
      // Zero-duration on the same day: floor/ceil both = 0, guard bumps to 1.
      const p = elementAt(
        position([mkEvent("e", 10, 10)], {
          days: dayDays,
          gridType: "day",
        }),
        0
      );

      expect(p.height).toBeCloseTo((1 / 7) * 100, 5);
    });
  });

  describe("Stack groups (stackGroup)", () => {
    it("positions leading stack group in its own column", () => {
      const result = position([
        mkEvent("c1", 17.5, 19, { stackGroup: "c1" }),
        mkEvent("ct-1", 17, 18, { stackGroup: "ct" }),
        mkEvent("ct-2", 18, 19, { stackGroup: "ct" }),
      ]);

      expect(result).toHaveLength(3);
      const byId = new Map(result.map((p) => [p.event.id, p]));
      // C1 group sorts first (longest anchor) → left column.
      expect(byId.get("c1")?.left).toBe(0);
      expect(byId.get("c1")?.width).toBe(50);
    });

    it("places same-group events sharing the adjacent column", () => {
      const result = position([
        mkEvent("c1", 17.5, 19, { stackGroup: "c1" }),
        mkEvent("ct-1", 17, 18, { stackGroup: "ct" }),
        mkEvent("ct-2", 18, 19, { stackGroup: "ct" }),
      ]);

      const byId = new Map(result.map((p) => [p.event.id, p]));
      // CT group shares the right column.
      expect(byId.get("ct-1")?.left).toBe(50);
      expect(byId.get("ct-1")?.width).toBe(50);
      expect(byId.get("ct-2")?.left).toBe(50);
      expect(byId.get("ct-2")?.width).toBe(50);
    });

    it("keeps a group's column stable across adjacent clusters", () => {
      // Same two groups in two clusters: the longer anchor (g1) always leads,
      // so g1 events stay in the left column in both clusters.
      const result = position([
        mkEvent("g1-a", 9, 11, { stackGroup: "g1" }),
        mkEvent("g2-a", 9.5, 10, { stackGroup: "g2" }),
        mkEvent("g1-b", 12, 14, { stackGroup: "g1" }),
        mkEvent("g2-b", 12.5, 13, { stackGroup: "g2" }),
      ]);

      const byId = new Map(result.map((p) => [p.event.id, p]));
      expect(byId.get("g1-a")?.left).toBe(0);
      expect(byId.get("g2-a")?.left).toBe(50);
      expect(byId.get("g1-b")?.left).toBe(0);
      expect(byId.get("g2-b")?.left).toBe(50);
    });

    it("groupless events still get their own column next to groups", () => {
      const result = position([
        mkEvent("grouped", 9, 11, { stackGroup: "g" }),
        mkEvent("lone", 9.5, 10),
      ]);

      expect(result.map((p) => p.left).toSorted((a, b) => a - b)).toStrictEqual(
        [0, 50]
      );
      expect(result.map((p) => p.width)).toStrictEqual([50, 50]);
    });

    it("eventOverlap still wins over stack groups (full width)", () => {
      const result = position(
        [
          mkEvent("a", 9, 11, { stackGroup: "x" }),
          mkEvent("b", 9.5, 10, { stackGroup: "y" }),
        ],
        { eventOverlap: true }
      );

      expect(result.map((p) => p.left)).toStrictEqual([0, 0]);
      expect(result.map((p) => p.width)).toStrictEqual([100, 100]);
    });
  });

  describe("Stability", () => {
    it("nests the original event by reference, un-mutated and un-copied", () => {
      const source = mkEvent("kept", 9, 10, {
        color: "blue",
        description: "some description",
        title: "Kept Title",
      });

      const p = elementAt(position([source]), 0);
      expect(p.event).toBe(source);
    });

    it("emits vertical-kind placements", () => {
      const p = elementAt(position([mkEvent("e", 9, 10)]), 0);
      expect(p.kind).toBe("vertical");
    });
  });
});
