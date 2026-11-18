import { describe, expect, it } from "vitest";

import { isBusinessHour } from "@/features/calendar/utils/business-hours";
import type { BusinessHours } from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

const mondayHours = (
  startTime: number | string,
  endTime: number | string
): BusinessHours => ({
  daysOfWeek: ["monday"],
  endTime,
  startTime,
});

describe(isBusinessHour, () => {
  // Monday
  const monday = toZonedDateTime("2025-01-06T00:00:00.000Z");
  // Sunday
  const sunday = toZonedDateTime("2025-01-05T00:00:00.000Z");

  it("should return true when businessHours is undefined", () => {
    expect(isBusinessHour({ date: monday, hour: 10, minute: 0 })).toBeTruthy();
  });

  it("should respect custom businessHours object", () => {
    const config: BusinessHours = {
      // Monday only
      daysOfWeek: ["monday"],
      endTime: 14,
      startTime: 10,
    };

    expect(
      isBusinessHour({
        businessHours: config,
        date: monday,
        hour: 11,
        minute: 0,
      })
    ).toBeTruthy();
    expect(
      isBusinessHour({
        businessHours: config,
        date: monday,
        hour: 9,
        minute: 0,
      })
    ).toBeFalsy();
    expect(
      isBusinessHour({
        businessHours: config,
        date: monday,
        hour: 14,
        minute: 0,
      })
    ).toBeFalsy();
    expect(
      isBusinessHour({
        businessHours: config,
        date: sunday,
        hour: 11,
        minute: 0,
      })
    ).toBeFalsy();
  });

  it("should handle minutes correctly", () => {
    // Note: With integer hours, we can't specify 9:30 start time in config anymore
    // But we can test if 9:30 falls within 9-17 range
    const config: BusinessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    // 8:59 -> false
    expect(
      isBusinessHour({
        businessHours: config,
        date: monday,
        hour: 8,
        minute: 59,
      })
    ).toBeFalsy();
    // 9:00 -> true
    expect(
      isBusinessHour({
        businessHours: config,
        date: monday,
        hour: 9,
        minute: 0,
      })
    ).toBeTruthy();
    // 9:30 -> true
    expect(
      isBusinessHour({
        businessHours: config,
        date: monday,
        hour: 9,
        minute: 30,
      })
    ).toBeTruthy();
    // 16:59 -> true
    expect(
      isBusinessHour({
        businessHours: config,
        date: monday,
        hour: 16,
        minute: 59,
      })
    ).toBeTruthy();
    // 17:00 -> false
    expect(
      isBusinessHour({
        businessHours: config,
        date: monday,
        hour: 17,
        minute: 0,
      })
    ).toBeFalsy();
  });

  it("should work correctly regardless of firstDayOfWeek setting", () => {
    // This test verifies that isBusinessHour relies on the absolute date,
    // not on any relative week index.
    // We simulate this by checking a Sunday and a Monday.
    // Sunday is day 0, Monday is day 1.

    // Sunday
    const sundayDate = toZonedDateTime("2025-01-05T00:00:00.000Z");
    // Monday
    const mondayDate = toZonedDateTime("2025-01-06T00:00:00.000Z");

    const config: BusinessHours = {
      // Only Monday is business day
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    expect(
      isBusinessHour({
        businessHours: config,
        date: sundayDate,
        hour: 10,
        minute: 0,
      })
    ).toBeFalsy();
    expect(
      isBusinessHour({
        businessHours: config,
        date: mondayDate,
        hour: 10,
        minute: 0,
      })
    ).toBeTruthy();

    // Even if we had a config that included Sunday
    const sundayConfig: BusinessHours = {
      daysOfWeek: ["sunday"],
      endTime: 17,
      startTime: 9,
    };

    expect(
      isBusinessHour({
        businessHours: sundayConfig,
        date: sundayDate,
        hour: 10,
        minute: 0,
      })
    ).toBeTruthy();
    expect(
      isBusinessHour({
        businessHours: sundayConfig,
        date: mondayDate,
        hour: 10,
        minute: 0,
      })
    ).toBeFalsy();
  });

  it("should check only day if hour is undefined", () => {
    const config: BusinessHours = {
      daysOfWeek: ["monday"],
      endTime: 17,
      startTime: 9,
    };

    // Monday is a business day -> true
    expect(
      isBusinessHour({ businessHours: config, date: monday })
    ).toBeTruthy();

    // Sunday is not a business day -> false
    expect(isBusinessHour({ businessHours: config, date: sunday })).toBeFalsy();
  });

  describe("sub-hour boundaries", () => {
    // oxlint-disable-next-line unicorn/consistent-function-scoping -- captures values from its enclosing scope
    const check = (
      businessHours: BusinessHours,
      hour: number,
      minute = 0,
      durationMinutes?: number
    ) =>
      isBusinessHour({
        date: monday,
        businessHours,
        durationMinutes,
        hour,
        minute,
      });

    it("accepts HH:mm strings for startTime and endTime", () => {
      const config = mondayHours("09:15", "17:15");

      const results = [
        check(config, 9, 0),
        check(config, 9, 15),
        check(config, 17, 0),
        check(config, 17, 15),
      ];

      expect(results).toStrictEqual([false, true, true, false]);
    });

    it("rounds fractional numbers to the nearest whole hour", () => {
      // Sub-hour boundaries are strings-only; 9.25 is NOT 9:15.
      const config = mondayHours(9.25, 16.75);

      const results = [
        check(config, 8, 59),
        check(config, 9, 0),
        check(config, 16, 59),
        check(config, 17, 0),
      ];

      expect(results).toStrictEqual([false, true, true, false]);
    });

    it("treats a slot as business only when the whole slot fits (durationMinutes)", () => {
      const config = mondayHours("09:15", "17:15");

      // Hour slots: 9:00-10:00 crosses the 9:15 start, 17:00-18:00 the 17:15 end.
      const hourSlots = [
        check(config, 9, 0, 60),
        check(config, 10, 0, 60),
        check(config, 16, 0, 60),
        check(config, 17, 0, 60),
      ];

      expect(hourSlots).toStrictEqual([false, true, true, false]);

      // 15-minute slots align exactly with the boundaries.
      const quarterSlots = [
        check(config, 9, 0, 15),
        check(config, 9, 15, 15),
        check(config, 17, 0, 15),
        check(config, 17, 15, 15),
      ];

      expect(quarterSlots).toStrictEqual([false, true, true, false]);
    });

    it("keeps whole-slot containment identical to the point check for integer configs", () => {
      const config = mondayHours(9, 17);

      const hourSlots = [
        check(config, 8, 0, 60),
        check(config, 9, 0, 60),
        check(config, 16, 0, 60),
        check(config, 17, 0, 60),
      ];

      expect(hourSlots).toStrictEqual([false, true, true, false]);
    });

    it("falls back to the 9-17 defaults for malformed time strings", () => {
      const config = mondayHours("9am", "bogus");

      const results = [
        check(config, 8, 59),
        check(config, 9, 0),
        check(config, 16, 59),
        check(config, 17, 0),
      ];

      expect(results).toStrictEqual([false, true, true, false]);
    });

    it("falls back to the 9-17 defaults for out-of-range time strings", () => {
      const config = mondayHours("9:99", "25:00");

      const results = [
        check(config, 8, 59),
        check(config, 9, 0),
        check(config, 16, 59),
        check(config, 17, 0),
      ];

      expect(results).toStrictEqual([false, true, true, false]);
    });

    describe("slot duration × boundary matrix", () => {
      // Each slot tuple is [hour, minute, expectedBusiness] for the given
      // slot duration. Whole-slot containment: enabled iff
      // slotStart >= start AND slotStart + duration <= end for some config.
      interface MatrixCase {
        config: BusinessHours | BusinessHours[];
        duration: number;
        name: string;
        slots: [number, number, boolean][];
      }

      const cases: MatrixCase[] = [
        // --- 15-minute slots ---
        {
          config: mondayHours("09:15", "17:15"),
          duration: 15,
          name: "15-min slots, :15 boundaries (09:15-17:15)",
          slots: [
            [9, 0, false],
            [9, 15, true],
            [17, 0, true],
            [17, 15, false],
          ],
        },
        {
          config: mondayHours("09:30", "16:30"),
          duration: 15,
          name: "15-min slots, :30 boundaries (09:30-16:30)",
          slots: [
            [9, 15, false],
            [9, 30, true],
            [16, 15, true],
            [16, 30, false],
          ],
        },
        {
          config: mondayHours(9, 17),
          duration: 15,
          name: "15-min slots, whole-hour boundaries (9-17)",
          slots: [
            [8, 45, false],
            [9, 0, true],
            [16, 45, true],
            [17, 0, false],
          ],
        },
        // --- 30-minute slots ---
        {
          config: mondayHours("09:15", "17:15"),
          duration: 30,
          name: "30-min slots, :15 boundaries lose both partial slots (09:15-17:15)",
          slots: [
            // crosses the 9:15 start
            [9, 0, false],
            [9, 30, true],
            // ends 17:00 <= 17:15
            [16, 30, true],
            // ends 17:30 > 17:15
            [17, 0, false],
          ],
        },
        {
          config: mondayHours("09:30", "16:30"),
          duration: 30,
          name: "30-min slots, :30 boundaries align exactly (09:30-16:30)",
          slots: [
            [9, 0, false],
            [9, 30, true],
            [16, 0, true],
            [16, 30, false],
          ],
        },
        {
          config: mondayHours(9, 17),
          duration: 30,
          name: "30-min slots, whole-hour boundaries (9-17)",
          slots: [
            [8, 30, false],
            [9, 0, true],
            [16, 30, true],
            [17, 0, false],
          ],
        },
        // --- 60-minute slots ---
        {
          config: mondayHours("09:30", "16:30"),
          duration: 60,
          name: "60-min slots, :30 boundaries round inward a full hour (09:30-16:30)",
          slots: [
            [9, 0, false],
            [10, 0, true],
            // ends 16:00 <= 16:30
            [15, 0, true],
            // ends 17:00 > 16:30
            [16, 0, false],
          ],
        },
        // --- misaligned 16-minute slots (pathological duration) ---
        {
          config: mondayHours(9, 17),
          duration: 16,
          name: "16-min slots, whole-hour boundaries (9-17)",
          slots: [
            // starts before 9:00
            [8, 48, false],
            [9, 0, true],
            // ends exactly 17:00
            [16, 44, true],
            // ends 17:01 > 17:00
            [16, 45, false],
          ],
        },
        {
          config: mondayHours("09:15", "17:15"),
          duration: 16,
          name: "16-min slots, :15 boundaries (09:15-17:15)",
          slots: [
            [9, 0, false],
            [9, 15, true],
            // ends exactly 17:15
            [16, 59, true],
            // ends 17:16 > 17:15
            [17, 0, false],
          ],
        },
        // --- odd sub-hour boundaries (:25, :50, :55) ---
        {
          config: mondayHours("09:25", "16:50"),
          duration: 15,
          name: "15-min slots, odd boundaries snap inward (09:25-16:50)",
          slots: [
            // starts before 9:25
            [9, 15, false],
            // first slot fully inside
            [9, 30, true],
            // ends 16:45 <= 16:50
            [16, 30, true],
            // ends 17:00 > 16:50
            [16, 45, false],
          ],
        },
        {
          config: mondayHours("09:25", "16:55"),
          duration: 30,
          name: "30-min slots, odd boundaries (09:25-16:55)",
          slots: [
            [9, 0, false],
            [9, 30, true],
            // ends 16:30 <= 16:55
            [16, 0, true],
            // ends 17:00 > 16:55
            [16, 30, false],
          ],
        },
        {
          config: mondayHours("09:55", "17:00"),
          duration: 60,
          name: "60-min slots, :55 start loses nearly the whole first hour (09:55-17:00)",
          slots: [
            [9, 0, false],
            [10, 0, true],
            [16, 0, true],
            [17, 0, false],
          ],
        },
        // --- degenerate and boundary-of-day ranges ---
        {
          config: mondayHours("09:15", "09:15"),
          duration: 15,
          name: "zero-width range disables everything (09:15-09:15)",
          slots: [
            [9, 0, false],
            [9, 15, false],
            [9, 30, false],
          ],
        },
        {
          config: mondayHours("17:00", "09:00"),
          duration: 15,
          name: "inverted range is an overnight window (17:00-09:00 next day)",
          slots: [
            // inside the overnight tail
            [8, 0, true],
            // between the tail and the head
            [12, 0, false],
            // inside the head
            [18, 0, true],
          ],
        },
        {
          config: mondayHours("09:15", "09:30"),
          duration: 60,
          name: "range narrower than the slot disables the slot (09:15-09:30 @ 60min)",
          slots: [
            [9, 0, false],
            [9, 15, false],
          ],
        },
        {
          config: mondayHours("09:15", "09:30"),
          duration: 15,
          name: "range equal to one slot enables exactly that slot (09:15-09:30 @ 15min)",
          slots: [
            [9, 0, false],
            [9, 15, true],
            [9, 30, false],
          ],
        },
        {
          config: mondayHours(0, "24:00"),
          duration: 60,
          name: "full-day range with 24:00 end (0-24:00 @ 60min)",
          slots: [
            [0, 0, true],
            [23, 0, true],
          ],
        },
        // --- multiple configs on the same day ---
        {
          config: [
            { daysOfWeek: ["monday"], endTime: "12:15", startTime: "09:15" },
            { daysOfWeek: ["monday"], endTime: "17:45", startTime: "13:45" },
          ],
          duration: 30,
          name: "split shifts with sub-hour boundaries and a gap (09:15-12:15, 13:45-17:45 @ 30min)",
          slots: [
            // inside the morning shift
            [9, 30, true],
            // crosses the 12:15 morning end
            [12, 0, false],
            // in the gap
            [12, 30, false],
            // crosses the 13:45 afternoon start
            [13, 30, false],
            // inside the afternoon shift
            [14, 0, true],
          ],
        },
        {
          // Containment is per config; the union of touching ranges is not
          // considered, so the 12:00 hour slot straddling the seam fails both.
          config: [
            { daysOfWeek: ["monday"], endTime: "12:30", startTime: "09:30" },
            { daysOfWeek: ["monday"], endTime: "17:30", startTime: "12:30" },
          ],
          duration: 60,
          name: "adjacent ranges do not merge: a slot spanning the seam is non-business (09:30-12:30, 12:30-17:30 @ 60min)",
          slots: [
            // fully inside the first range
            [11, 0, true],
            // straddles the seam
            [12, 0, false],
            // fully inside the second range
            [13, 0, true],
          ],
        },
        // --- point checks (no duration) with odd boundaries ---
        {
          config: mondayHours("09:25", "16:50"),
          duration: 0,
          name: "point check honors odd boundaries exactly (09:25-16:50)",
          slots: [
            [9, 24, false],
            [9, 25, true],
            [16, 49, true],
            [16, 50, false],
          ],
        },
      ];

      it.each(cases)("$name", (matrixCase) => {
        const results = matrixCase.slots.map(([hour, minute]) =>
          isBusinessHour({
            businessHours: matrixCase.config,
            date: monday,
            durationMinutes: matrixCase.duration || undefined,
            hour,
            minute,
          })
        );

        const expected = matrixCase.slots.map((slot) => slot[2]);
        expect(results).toStrictEqual(expected);
      });
    });
  });

  describe("overnight windows (endTime < startTime => next day)", () => {
    // Tuesday
    const tuesday = toZonedDateTime("2025-01-07T00:00:00.000Z");

    const config: BusinessHours = {
      daysOfWeek: ["monday"],
      endTime: "01:00",
      startTime: "13:00",
    };

    it("includes head and tail hours for overnight 13:00-01:00 window", () => {
      // Head of the window (same day).
      expect(
        isBusinessHour({ businessHours: config, date: monday, hour: 13 })
      ).toBeTruthy();
      expect(
        isBusinessHour({ businessHours: config, date: monday, hour: 23 })
      ).toBeTruthy();
      // Tail of the window (after midnight).
      expect(
        isBusinessHour({ businessHours: config, date: monday, hour: 0 })
      ).toBeTruthy();
    });

    it("excludes boundary and outside hours for overnight 13:00-01:00 window", () => {
      // 01:00 is the end
      expect(
        isBusinessHour({ businessHours: config, date: monday, hour: 1 })
      ).toBeFalsy();
      // Outside the window.
      expect(
        isBusinessHour({ businessHours: config, date: monday, hour: 8 })
      ).toBeFalsy();
      expect(
        isBusinessHour({ businessHours: config, date: monday, hour: 12 })
      ).toBeFalsy();
    });

    it("keeps whole-slot containment across midnight", () => {
      // A 30-min slot at 23:45 fits inside the head (ends 00:15, which is
      // within the overnight tail).
      expect(
        isBusinessHour({
          businessHours: config,
          date: monday,
          durationMinutes: 30,
          hour: 23,
          minute: 45,
        })
      ).toBeTruthy();
      // A slot starting 00:45 would end 01:15, past the 01:00 end.
      expect(
        isBusinessHour({
          businessHours: config,
          date: monday,
          durationMinutes: 30,
          hour: 0,
          minute: 45,
        })
      ).toBeFalsy();
    });

    it("only applies to the configured weekday", () => {
      expect(
        isBusinessHour({ businessHours: config, date: tuesday, hour: 18 })
      ).toBeFalsy();
      expect(
        isBusinessHour({ businessHours: config, date: tuesday, hour: 0 })
      ).toBeFalsy();
    });

    it("treats equal boundaries as closed", () => {
      const closed: BusinessHours = {
        daysOfWeek: ["monday"],
        endTime: "09:00",
        startTime: "09:00",
      };

      expect(
        isBusinessHour({ businessHours: closed, date: monday, hour: 9 })
      ).toBeFalsy();
    });
  });

  describe("Array of BusinessHours", () => {
    // monday/sunday reuse the module-scope dates (identical values).
    const tuesday = toZonedDateTime("2025-01-07T00:00:00.000Z");
    const wednesday = toZonedDateTime("2025-01-08T00:00:00.000Z");
    const thursday = toZonedDateTime("2025-01-09T00:00:00.000Z");
    const friday = toZonedDateTime("2025-01-10T00:00:00.000Z");
    const saturday = toZonedDateTime("2025-01-11T00:00:00.000Z");

    it("should handle array with different hours for Monday, Wednesday, and Friday", () => {
      const configs: BusinessHours[] = [
        {
          daysOfWeek: ["monday", "wednesday", "friday"],
          endTime: 17,
          startTime: 9,
        },
        {
          daysOfWeek: ["tuesday", "thursday"],
          endTime: 18,
          startTime: 10,
        },
      ];

      // Monday: 9-17
      expect(
        isBusinessHour({
          businessHours: configs,
          date: monday,
          hour: 9,
          minute: 0,
        })
      ).toBeTruthy();
      expect(
        isBusinessHour({
          businessHours: configs,
          date: monday,
          hour: 17,
          minute: 0,
        })
      ).toBeFalsy();
      expect(
        isBusinessHour({
          businessHours: configs,
          date: monday,
          hour: 8,
          minute: 59,
        })
      ).toBeFalsy();

      // Wednesday: 9-17
      expect(
        isBusinessHour({
          businessHours: configs,
          date: wednesday,
          hour: 12,
          minute: 0,
        })
      ).toBeTruthy();

      // Friday: 9-17
      expect(
        isBusinessHour({
          businessHours: configs,
          date: friday,
          hour: 14,
          minute: 0,
        })
      ).toBeTruthy();
    });

    it("should handle array with different hours for Tuesday and Thursday", () => {
      const configs: BusinessHours[] = [
        {
          daysOfWeek: ["monday", "wednesday", "friday"],
          endTime: 17,
          startTime: 9,
        },
        {
          daysOfWeek: ["tuesday", "thursday"],
          endTime: 18,
          startTime: 10,
        },
      ];

      // Tuesday: 10-18
      expect(
        isBusinessHour({
          businessHours: configs,
          date: tuesday,
          hour: 10,
          minute: 0,
        })
      ).toBeTruthy();
      expect(
        isBusinessHour({
          businessHours: configs,
          date: tuesday,
          hour: 9,
          minute: 0,
        })
      ).toBeFalsy();
      expect(
        isBusinessHour({
          businessHours: configs,
          date: tuesday,
          hour: 17,
          minute: 30,
        })
      ).toBeTruthy();
      expect(
        isBusinessHour({
          businessHours: configs,
          date: tuesday,
          hour: 18,
          minute: 0,
        })
      ).toBeFalsy();

      // Thursday: 10-18
      expect(
        isBusinessHour({
          businessHours: configs,
          date: thursday,
          hour: 16,
          minute: 0,
        })
      ).toBeTruthy();
    });

    it("should return false for days not in any config", () => {
      const configs: BusinessHours[] = [
        {
          daysOfWeek: ["monday", "wednesday", "friday"],
          endTime: 17,
          startTime: 9,
        },
        {
          daysOfWeek: ["tuesday", "thursday"],
          endTime: 18,
          startTime: 10,
        },
      ];

      // Saturday and Sunday not in any config
      expect(
        isBusinessHour({
          businessHours: configs,
          date: saturday,
          hour: 12,
          minute: 0,
        })
      ).toBeFalsy();
      expect(
        isBusinessHour({
          businessHours: configs,
          date: sunday,
          hour: 12,
          minute: 0,
        })
      ).toBeFalsy();
    });

    it("should check only day if hour is undefined with array", () => {
      const configs: BusinessHours[] = [
        {
          daysOfWeek: ["monday"],
          endTime: 17,
          startTime: 9,
        },
        {
          daysOfWeek: ["tuesday"],
          endTime: 18,
          startTime: 10,
        },
      ];

      // Monday is a business day
      expect(
        isBusinessHour({ businessHours: configs, date: monday })
      ).toBeTruthy();

      // Tuesday is a business day
      expect(
        isBusinessHour({ businessHours: configs, date: tuesday })
      ).toBeTruthy();

      // Sunday is not a business day
      expect(
        isBusinessHour({ businessHours: configs, date: sunday })
      ).toBeFalsy();
    });

    it("should handle empty array", () => {
      const configs: BusinessHours[] = [];

      // Empty array means no business hours configured
      expect(
        isBusinessHour({
          businessHours: configs,
          date: monday,
          hour: 12,
          minute: 0,
        })
      ).toBeFalsy();
    });

    it("should work with single-element array", () => {
      const configs: BusinessHours[] = [
        {
          daysOfWeek: ["monday"],
          endTime: 17,
          startTime: 9,
        },
      ];

      expect(
        isBusinessHour({
          businessHours: configs,
          date: monday,
          hour: 12,
          minute: 0,
        })
      ).toBeTruthy();
      expect(
        isBusinessHour({
          businessHours: configs,
          date: tuesday,
          hour: 12,
          minute: 0,
        })
      ).toBeFalsy();
    });

    it("should handle multiple overlapping or separate rules for the same day", () => {
      const configs: BusinessHours[] = [
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

      // Tuesday 11:00 should be true (Rule 1)
      expect(
        isBusinessHour({
          businessHours: configs,
          date: tuesday,
          hour: 11,
          minute: 0,
        })
      ).toBeTruthy();

      // Tuesday 15:00 should be true (Rule 2)
      expect(
        isBusinessHour({
          businessHours: configs,
          date: tuesday,
          hour: 15,
          minute: 0,
        })
      ).toBeTruthy();

      // Tuesday 13:00 should be false (Gap between rules)
      expect(
        isBusinessHour({
          businessHours: configs,
          date: tuesday,
          hour: 13,
          minute: 0,
        })
      ).toBeFalsy();
    });
  });
});
