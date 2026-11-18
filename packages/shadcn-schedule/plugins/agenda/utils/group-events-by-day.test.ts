import { describe, expect, it } from "vitest";

import { groupEventsByDay } from "@/plugins/agenda/utils/group-events-by-day";
import { elementAt } from "@/test-utils/element-at";
import type { CalendarEvent } from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

const mkEvent = (
  id: string,
  startISO: string,
  endISO: string,
  extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  end: toZonedDateTime(endISO),
  id,
  start: toZonedDateTime(startISO),
  title: `Event ${id}`,
  ...extra,
});

const run = (events: CalendarEvent[], startISO: string, endISO: string) =>
  groupEventsByDay(events, {
    end: toZonedDateTime(endISO),
    start: toZonedDateTime(startISO),
  });

describe(groupEventsByDay, () => {
  it("returns an empty array when there are no events", () => {
    expect(run([], "2026-06-01T00:00:00", "2026-06-30T23:59:59")).toStrictEqual(
      []
    );
  });

  it("groups by day, skips empty days, orders chronologically", () => {
    const events = [
      mkEvent("b", "2026-06-03T09:00:00", "2026-06-03T10:00:00"),
      mkEvent("a", "2026-06-01T09:00:00", "2026-06-01T10:00:00"),
    ];

    const groups = run(events, "2026-06-01T00:00:00", "2026-06-05T23:59:59");
    expect(groups.map((g) => g.key)).toStrictEqual([
      "2026-06-01",
      "2026-06-03",
    ]);
    expect(groups.map((g) => g.events.map((e) => e.id))).toStrictEqual([
      ["a"],
      ["b"],
    ]);
  });

  it("sorts within a day: all-day first, then by start time", () => {
    const events = [
      mkEvent("timed-late", "2026-06-01T15:00:00", "2026-06-01T16:00:00"),
      mkEvent("allday", "2026-06-01T00:00:00", "2026-06-01T23:59:59", {
        allDay: true,
      }),
      mkEvent("timed-early", "2026-06-01T09:00:00", "2026-06-01T10:00:00"),
    ];

    const group = elementAt(
      run(events, "2026-06-01T00:00:00", "2026-06-01T23:59:59"),
      0
    );

    expect(group.events.map((e) => e.id)).toStrictEqual([
      "allday",
      "timed-early",
      "timed-late",
    ]);
  });

  it("places a timed event only on its start day, even across midnight", () => {
    const events = [
      mkEvent("overnight", "2026-06-02T23:00:00", "2026-06-03T01:00:00"),
    ];

    const groups = run(events, "2026-06-01T00:00:00", "2026-06-05T23:59:59");
    expect(groups.map((g) => g.key)).toStrictEqual(["2026-06-02"]);
  });

  it("repeats a multi-day all-day event under each overlapped day in the range", () => {
    const events = [
      mkEvent("multi", "2026-06-02T00:00:00", "2026-06-04T23:59:59", {
        allDay: true,
      }),
    ];

    const groups = run(events, "2026-06-01T00:00:00", "2026-06-05T23:59:59");
    expect(groups.map((g) => g.key)).toStrictEqual([
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
    ]);
    expect(groups.every((g) => g.events.at(0)?.id === "multi")).toBeTruthy();
  });

  it("clamps a multi-day event to the range window", () => {
    const events = [
      mkEvent("multi", "2026-05-30T00:00:00", "2026-06-03T23:59:59", {
        allDay: true,
      }),
    ];

    const groups = run(events, "2026-06-01T00:00:00", "2026-06-02T23:59:59");
    expect(groups.map((g) => g.key)).toStrictEqual([
      "2026-06-01",
      "2026-06-02",
    ]);
  });
});
