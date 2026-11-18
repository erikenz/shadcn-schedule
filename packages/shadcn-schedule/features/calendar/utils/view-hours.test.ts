import { describe, expect, it } from "vitest";

import { getViewHours } from "@/features/calendar/utils/view-hours";
import type { BusinessHours } from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

describe(getViewHours, () => {
  // A Wednesday
  const referenceDate = toZonedDateTime("2025-01-01T00:00:00.000Z");

  it("returns 24 hours when hideNonBusinessHours is false", () => {
    const hours = getViewHours({
      hideNonBusinessHours: false,
      referenceDate,
    });

    expect(hours).toHaveLength(24);
    expect(hours[0]?.hour).toBe(0);
    expect(hours[23]?.hour).toBe(23);
  });

  it("returns 24 hours when businessHours is not provided", () => {
    const hours = getViewHours({
      hideNonBusinessHours: true,
      referenceDate,
    });

    expect(hours).toHaveLength(24);
  });

  it("filters hours based on simple businessHours", () => {
    const businessHours = {
      endTime: 17,
      startTime: 9,
    };

    const hours = getViewHours({
      businessHours,
      referenceDate,
      hideNonBusinessHours: true,
    });

    // 9, 10, 11, 12, 13, 14, 15, 16
    expect(hours).toHaveLength(8);
    expect(hours[0]?.hour).toBe(9);
    expect(hours[7]?.hour).toBe(16);
  });

  it("handles multiple days with different business hours", () => {
    const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
    const tuesday = toZonedDateTime("2025-01-07T00:00:00.000Z");

    const businessHours: BusinessHours[] = [
      { daysOfWeek: ["monday"], endTime: 12, startTime: 8 },
      { daysOfWeek: ["tuesday"], endTime: 18, startTime: 14 },
    ];

    const hours = getViewHours({
      businessHours,
      allDates: [monday, tuesday],
      hideNonBusinessHours: true,
      referenceDate: monday,
    });

    // Range should be earliest start (8) to latest end (18)
    // 8, 9, 10, 11, 12, 13, 14, 15, 16, 17
    expect(hours).toHaveLength(10);
    expect(hours[0]?.hour).toBe(8);
    expect(hours[9]?.hour).toBe(17);
  });

  it("falls back to 9-17 if startTime/endTime are missing in config", () => {
    const businessHours: BusinessHours = { daysOfWeek: ["wednesday"] };

    const hours = getViewHours({
      businessHours,
      referenceDate,
      hideNonBusinessHours: true,
    });

    expect(hours[0]?.hour).toBe(9);
    expect(hours[7]?.hour).toBe(16);
  });

  it("falls back to global business hours range if no config found for the specific date", () => {
    const sunday = toZonedDateTime("2025-01-05T00:00:00.000Z");

    const businessHours: BusinessHours[] = [
      { daysOfWeek: ["monday"], endTime: 18, startTime: 10 },
    ];

    const hours = getViewHours({
      businessHours,
      hideNonBusinessHours: true,
      referenceDate: sunday,
    });

    // Should use the 10-18 range from Monday since Sunday has no config
    expect(hours).toHaveLength(8);
    expect(hours[0]?.hour).toBe(10);
    expect(hours[7]?.hour).toBe(17);
  });

  it("merges global and resource-specific business hours", () => {
    const globalBH = { endTime: 16, startTime: 10 };

    const resourceBH: BusinessHours[] = [
      {
        daysOfWeek: ["wednesday"],
        endTime: 12,
        startTime: 8,
      },
      {
        daysOfWeek: ["wednesday"],
        endTime: 18,
        startTime: 14,
      },
    ];

    const hours = getViewHours({
      referenceDate,
      businessHours: globalBH,
      hideNonBusinessHours: true,
      resourceBusinessHours: [resourceBH],
    });

    // Earliest start: 8, Latest end: 18
    expect(hours[0]?.hour).toBe(8);
    expect(hours.at(-1)?.hour).toBe(17);
    expect(hours).toHaveLength(10);
  });

  it("handles multiple overlapping or separate rules (user-reported split shifts)", () => {
    const businessHours: BusinessHours[] = [
      {
        daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        endTime: 12,
        startTime: 10,
      },
      {
        daysOfWeek: ["tuesday"],
        endTime: 16,
        startTime: 14,
      },
    ];

    const hours = getViewHours({
      businessHours,
      hideNonBusinessHours: true,
      // Tuesday
      referenceDate: toZonedDateTime("2025-01-07T00:00:00.000Z"),
    });

    // Should show range from earliest start (10) to latest end (16)
    expect(hours[0]?.hour).toBe(10);
    expect(hours.at(-1)?.hour).toBe(15);
    // 10, 11, 12, 13, 14, 15
    expect(hours).toHaveLength(6);
  });

  it("keeps partially-business boundary hours visible for sub-hour boundaries", () => {
    const businessHours: BusinessHours = {
      endTime: "17:15",
      startTime: "09:15",
    };

    const hours = getViewHours({
      businessHours,
      referenceDate,
      hideNonBusinessHours: true,
    });

    // The 9:00 row hosts the 9:15 start and the 17:00 row the 17:15 end.
    // 9 .. 17
    expect(hours).toHaveLength(9);
    expect(hours.at(0)?.hour).toBe(9);
    expect(hours.at(-1)?.hour).toBe(17);
  });

  it("returns no hours when business range is empty", () => {
    const businessHours: BusinessHours = {
      daysOfWeek: ["wednesday"],
      endTime: 0,
      startTime: 0,
    };

    const hours = getViewHours({
      businessHours,
      referenceDate,
      hideNonBusinessHours: true,
    });

    expect(hours).toHaveLength(0);
  });

  it("wraps overnight business hours across midnight (13:00-01:00)", () => {
    const businessHours: BusinessHours = {
      daysOfWeek: ["wednesday"],
      endTime: "01:00",
      startTime: "13:00",
    };

    const hours = getViewHours({
      businessHours,
      referenceDate,
      hideNonBusinessHours: true,
    });

    // Hours render wrapped: 13..23 first, then 0, so a day column flows
    // continuously across midnight (events are not split across days). The
    // 01:00 hour cell is outside the window (01:00 is the exclusive end).
    expect(hours.map((hour) => hour.hour)).toStrictEqual([
      13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0,
    ]);

    // The wrapped tail belongs to the next day: the layout compares event and
    // grid bounds in absolute time, so a same-day 00:00 would precede the
    // evening columns and drop every event crossing midnight.
    expect(hours.at(-1)?.toPlainDate().toString()).toBe(
      referenceDate.add({ days: 1 }).toPlainDate().toString()
    );
  });

  it("wraps a 20:00-02:00 overnight window", () => {
    const businessHours: BusinessHours = {
      daysOfWeek: ["wednesday"],
      endTime: "02:00",
      startTime: "20:00",
    };

    const hours = getViewHours({
      businessHours,
      referenceDate,
      hideNonBusinessHours: true,
    });

    expect(hours.map((hour) => hour.hour)).toStrictEqual([
      20, 21, 22, 23, 0, 1,
    ]);
  });
});
