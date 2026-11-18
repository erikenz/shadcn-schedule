import { afterEach, describe, expect, it } from "vitest";

import {
  getDayHours,
  getDayKey,
  getMonthWeeks,
  getWeekDays,
  isToday,
} from "@/lib/utils/date-utils";
import { elementAt } from "@/test-utils/element-at";
import {
  diff,
  endOf,
  format,
  isSame,
  now,
  setDefaultTimeZone,
  startOf,
  toZonedDateTime,
  unix,
  weekday,
} from "@/utils/temporal";

/* oxlint-disable sonarjs/parameterized-tests -- each case pins a different calendar edge (DST, month length, ISO week); the per-case comments carry the intent and a table would drop them */

describe(isToday, () => {
  it("should return true when the date is today", () => {
    expect(isToday(now())).toBeTruthy();
  });

  it("should return false when the date is yesterday", () => {
    expect(isToday(now().subtract({ days: 1 }))).toBeFalsy();
  });

  it("should return false when the date is tomorrow", () => {
    expect(isToday(now().add({ days: 1 }))).toBeFalsy();
  });

  it("should return true for different times on today", () => {
    expect(isToday(now().with({ hour: 0, minute: 0 }))).toBeTruthy();
    expect(isToday(now().with({ hour: 23, minute: 59 }))).toBeTruthy();
  });
});

describe(getDayKey, () => {
  it("should format a date as YYYY-MM-DD", () => {
    expect(getDayKey(toZonedDateTime("2025-10-13T00:00:00.000Z"))).toBe(
      "2025-10-13"
    );
  });

  it("should ignore time-of-day", () => {
    const morning = toZonedDateTime("2025-10-13T08:15:30.000Z");
    const evening = toZonedDateTime("2025-10-13T22:45:00.000Z");
    expect(getDayKey(morning)).toBe(getDayKey(evening));
  });
});

describe(getDayHours, () => {
  it("should return exactly 24 hours by default", () => {
    const hours = getDayHours();
    expect(hours).toHaveLength(24);
  });

  it("should return hours with sequential .hour() values 0-23", () => {
    const hours = getDayHours();

    for (const [i, h] of hours.entries()) {
      expect(h.hour).toBe(i);
    }
  });

  it("should return hours on the reference date", () => {
    const referenceDate = toZonedDateTime("2025-06-15T00:00:00.000Z");
    const hours = getDayHours({ referenceDate });

    expect(hours).toHaveLength(24);

    for (const [i, h] of hours.entries()) {
      expect(h.hour).toBe(i);
      expect(format(h, "YYYY-MM-DD")).toBe("2025-06-15");
    }
  });

  it("should produce unique timestamps (each entry is a distinct moment)", () => {
    const hours = getDayHours();

    const timestamps = hours.map((h) => h.epochMilliseconds);
    const uniqueTimestamps = new Set(timestamps);
    expect(uniqueTimestamps.size).toBe(24);
  });

  it("should respect custom length", () => {
    const hours = getDayHours({ length: 12 });
    expect(hours).toHaveLength(12);

    for (const [i, h] of hours.entries()) {
      expect(h.hour).toBe(i);
    }
  });
});

describe(getWeekDays, () => {
  describe("Sunday as first day of week (0)", () => {
    const firstDayOfWeek = 0;

    it("should return week starting from Sunday when current date is Sunday", () => {
      // Sunday
      const currentDate = toZonedDateTime("2025-10-12T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-12");
      // Sunday
      expect(weekday(elementAt(weekDays, 0))).toBe(0);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-18");
      // Saturday
      expect(weekday(elementAt(weekDays, 6))).toBe(6);
    });

    it("should return week starting from Sunday when current date is Monday", () => {
      // Monday
      const currentDate = toZonedDateTime("2025-10-13T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-12");
      // Sunday
      expect(weekday(elementAt(weekDays, 0))).toBe(0);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-18");
      // Saturday
      expect(weekday(elementAt(weekDays, 6))).toBe(6);
    });

    it("should include current date in week when current date is Monday (Sunday first)", () => {
      const currentDate = toZonedDateTime("2025-10-13T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);
      expect(
        weekDays.some((day) => isSame(day, currentDate, "day"))
      ).toBeTruthy();
    });

    it("should return week starting from Sunday when current date is Saturday", () => {
      // Saturday
      const currentDate = toZonedDateTime("2025-10-18T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-12");
      // Sunday
      expect(weekday(elementAt(weekDays, 0))).toBe(0);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-18");
      // Saturday
      expect(weekday(elementAt(weekDays, 6))).toBe(6);
    });

    it("should include current date in week when current date is Saturday (Sunday first)", () => {
      const currentDate = toZonedDateTime("2025-10-18T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);
      expect(
        weekDays.some((day) => isSame(day, currentDate, "day"))
      ).toBeTruthy();
    });
  });

  describe("Monday as first day of week (1)", () => {
    const firstDayOfWeek = 1;

    it("should return week starting from Monday when current date is Monday", () => {
      // Monday
      const currentDate = toZonedDateTime("2025-10-13T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-13");
      // Monday
      expect(weekday(elementAt(weekDays, 0))).toBe(1);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-19");
      // Sunday
      expect(weekday(elementAt(weekDays, 6))).toBe(0);
    });

    it("should return week starting from Monday when current date is Sunday", () => {
      // Sunday
      const currentDate = toZonedDateTime("2025-10-12T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-06");
      // Monday
      expect(weekday(elementAt(weekDays, 0))).toBe(1);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-12");
      // Sunday
      expect(weekday(elementAt(weekDays, 6))).toBe(0);
    });

    it("should include current date in week when current date is Sunday (Monday first)", () => {
      const currentDate = toZonedDateTime("2025-10-12T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);
      expect(
        weekDays.some((day) => isSame(day, currentDate, "day"))
      ).toBeTruthy();
    });

    it("should return week starting from Monday when current date is Wednesday", () => {
      // Wednesday
      const currentDate = toZonedDateTime("2025-10-15T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-13");
      // Monday
      expect(weekday(elementAt(weekDays, 0))).toBe(1);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-19");
      // Sunday
      expect(weekday(elementAt(weekDays, 6))).toBe(0);
    });

    it("should include current date in week when current date is Wednesday (Monday first)", () => {
      const currentDate = toZonedDateTime("2025-10-15T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);
      expect(
        weekDays.some((day) => isSame(day, currentDate, "day"))
      ).toBeTruthy();
    });
  });

  describe("Wednesday as first day of week (3)", () => {
    const firstDayOfWeek = 3;

    it("should return week starting from Wednesday when current date is Wednesday", () => {
      // Wednesday
      const currentDate = toZonedDateTime("2025-10-15T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-15");
      // Wednesday
      expect(weekday(elementAt(weekDays, 0))).toBe(3);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-21");
      // Tuesday
      expect(weekday(elementAt(weekDays, 6))).toBe(2);
    });

    it("should return week starting from Wednesday when current date is Monday", () => {
      // Monday
      const currentDate = toZonedDateTime("2025-10-13T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-08");
      // Wednesday
      expect(weekday(elementAt(weekDays, 0))).toBe(3);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-14");
      // Tuesday
      expect(weekday(elementAt(weekDays, 6))).toBe(2);
    });

    it("should include current date in week when current date is Monday (Wednesday first)", () => {
      const currentDate = toZonedDateTime("2025-10-13T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);
      expect(
        weekDays.some((day) => isSame(day, currentDate, "day"))
      ).toBeTruthy();
    });

    it("should return week starting from Wednesday when current date is Tuesday", () => {
      // Tuesday
      const currentDate = toZonedDateTime("2025-10-14T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-08");
      // Wednesday
      expect(weekday(elementAt(weekDays, 0))).toBe(3);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-14");
      // Tuesday
      expect(weekday(elementAt(weekDays, 6))).toBe(2);
    });

    it("should include current date in week when current date is Tuesday (Wednesday first)", () => {
      const currentDate = toZonedDateTime("2025-10-14T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);
      expect(
        weekDays.some((day) => isSame(day, currentDate, "day"))
      ).toBeTruthy();
    });

    it("should return week starting from Wednesday when current date is Thursday", () => {
      // Thursday
      const currentDate = toZonedDateTime("2025-10-16T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-15");
      // Wednesday
      expect(weekday(elementAt(weekDays, 0))).toBe(3);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-21");
      // Tuesday
      expect(weekday(elementAt(weekDays, 6))).toBe(2);
    });

    it("should include current date in week when current date is Thursday (Wednesday first)", () => {
      const currentDate = toZonedDateTime("2025-10-16T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);
      expect(
        weekDays.some((day) => isSame(day, currentDate, "day"))
      ).toBeTruthy();
    });
  });

  describe("Friday as first day of week (5)", () => {
    const firstDayOfWeek = 5;

    it("should return week starting from Friday when current date is Friday", () => {
      // Friday
      const currentDate = toZonedDateTime("2025-10-17T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-17");
      // Friday
      expect(weekday(elementAt(weekDays, 0))).toBe(5);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-23");
      // Thursday
      expect(weekday(elementAt(weekDays, 6))).toBe(4);
    });

    it("should return week starting from Friday when current date is Monday", () => {
      // Monday
      const currentDate = toZonedDateTime("2025-10-13T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-10");
      // Friday
      expect(weekday(elementAt(weekDays, 0))).toBe(5);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-16");
      // Thursday
      expect(weekday(elementAt(weekDays, 6))).toBe(4);
    });

    it("should include current date in week when current date is Monday (Friday first)", () => {
      const currentDate = toZonedDateTime("2025-10-13T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);
      expect(
        weekDays.some((day) => isSame(day, currentDate, "day"))
      ).toBeTruthy();
    });

    it("should return week starting from Friday when current date is Thursday", () => {
      // Thursday
      const currentDate = toZonedDateTime("2025-10-16T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-10");
      // Friday
      expect(weekday(elementAt(weekDays, 0))).toBe(5);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-16");
      // Thursday
      expect(weekday(elementAt(weekDays, 6))).toBe(4);
    });

    it("should include current date in week when current date is Thursday (Friday first)", () => {
      const currentDate = toZonedDateTime("2025-10-16T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);
      expect(
        weekDays.some((day) => isSame(day, currentDate, "day"))
      ).toBeTruthy();
    });
  });

  describe("Saturday as first day of week (6)", () => {
    const firstDayOfWeek = 6;

    it("should return week starting from Saturday when current date is Saturday", () => {
      // Saturday
      const currentDate = toZonedDateTime("2025-10-18T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-18");
      // Saturday
      expect(weekday(elementAt(weekDays, 0))).toBe(6);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-24");
      // Friday
      expect(weekday(elementAt(weekDays, 6))).toBe(5);
    });

    it("should return week starting from Saturday when current date is Monday", () => {
      // Monday
      const currentDate = toZonedDateTime("2025-10-13T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-11");
      // Saturday
      expect(weekday(elementAt(weekDays, 0))).toBe(6);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-17");
      // Friday
      expect(weekday(elementAt(weekDays, 6))).toBe(5);
    });

    it("should include current date in week when current date is Monday (Saturday first)", () => {
      const currentDate = toZonedDateTime("2025-10-13T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);
      expect(
        weekDays.some((day) => isSame(day, currentDate, "day"))
      ).toBeTruthy();
    });

    it("should return week starting from Saturday when current date is Friday", () => {
      // Friday
      const currentDate = toZonedDateTime("2025-10-17T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-11");
      // Saturday
      expect(weekday(elementAt(weekDays, 0))).toBe(6);
      expect(format(elementAt(weekDays, 6), "YYYY-MM-DD")).toBe("2025-10-17");
      // Friday
      expect(weekday(elementAt(weekDays, 6))).toBe(5);
    });

    it("should include current date in week when current date is Friday (Saturday first)", () => {
      const currentDate = toZonedDateTime("2025-10-17T00:00:00.000Z");
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);
      expect(
        weekDays.some((day) => isSame(day, currentDate, "day"))
      ).toBeTruthy();
    });
  });

  describe("Edge cases", () => {
    it("should always return exactly 7 days", () => {
      const testDates = [
        // New Year
        "2025-01-01T00:00:00.000Z",
        // End of February
        "2025-02-28T00:00:00.000Z",
        // End of year
        "2025-12-31T00:00:00.000Z",
        // Mid year
        "2025-06-15T00:00:00.000Z",
      ];

      const firstDayValues = [0, 1, 2, 3, 4, 5, 6];

      for (const dateString of testDates) {
        for (const firstDay of firstDayValues) {
          const weekDays = getWeekDays(toZonedDateTime(dateString), firstDay);
          expect(weekDays).toHaveLength(7);
        }
      }
    });

    it("should always include the current date in the returned week", () => {
      const testDates = [
        // Sunday
        "2025-10-12T00:00:00.000Z",
        // Monday
        "2025-10-13T00:00:00.000Z",
        // Tuesday
        "2025-10-14T00:00:00.000Z",
        // Wednesday
        "2025-10-15T00:00:00.000Z",
        // Thursday
        "2025-10-16T00:00:00.000Z",
        // Friday
        "2025-10-17T00:00:00.000Z",
        // Saturday
        "2025-10-18T00:00:00.000Z",
      ];

      const firstDayValues = [0, 1, 2, 3, 4, 5, 6];

      for (const dateString of testDates) {
        for (const firstDay of firstDayValues) {
          const currentDate = toZonedDateTime(dateString);
          const weekDays = getWeekDays(currentDate, firstDay);

          const includesCurrentDate = weekDays.some((day) =>
            isSame(day, currentDate, "day")
          );

          expect(includesCurrentDate).toBeTruthy();
        }
      }
    });

    it("should return consecutive days without gaps", () => {
      const currentDate = toZonedDateTime("2025-10-13T00:00:00.000Z");
      const firstDayValues = [0, 1, 2, 3, 4, 5, 6];

      for (const firstDay of firstDayValues) {
        const weekDays = getWeekDays(currentDate, firstDay);

        for (let dayIndex = 1; dayIndex < weekDays.length; dayIndex += 1) {
          const previousDay = elementAt(weekDays, dayIndex - 1);
          const currentDay = elementAt(weekDays, dayIndex);
          const dayDifference = diff(currentDay, previousDay, "day");

          expect(dayDifference).toBe(1);
        }
      }
    });

    it("should start with the correct first day of week", () => {
      const currentDate = toZonedDateTime("2025-10-13T00:00:00.000Z");
      const firstDayValues = [0, 1, 2, 3, 4, 5, 6];

      for (const firstDay of firstDayValues) {
        const weekDays = getWeekDays(currentDate, firstDay);
        const firstDayOfWeekValue = weekday(elementAt(weekDays, 0));

        expect(firstDayOfWeekValue).toBe(firstDay);
      }
    });

    it("should handle month boundaries correctly", () => {
      // First day of month
      const currentDate = toZonedDateTime("2025-10-01T00:00:00.000Z");
      // Monday start
      const weekDays = getWeekDays(currentDate, 1);

      expect(weekDays).toHaveLength(7);

      const includesCurrentDate = weekDays.some((day) =>
        isSame(day, currentDate, "day")
      );

      expect(includesCurrentDate).toBeTruthy();

      const firstDayValue = weekday(elementAt(weekDays, 0));
      expect(firstDayValue).toBe(1);
    });

    it("should handle year boundaries correctly", () => {
      // Last day of year
      const currentDate = toZonedDateTime("2025-12-31T00:00:00.000Z");
      // Monday start
      const weekDays = getWeekDays(currentDate, 1);

      expect(weekDays).toHaveLength(7);

      const includesCurrentDate = weekDays.some((day) =>
        isSame(day, currentDate, "day")
      );

      expect(includesCurrentDate).toBeTruthy();

      const firstDayValue = weekday(elementAt(weekDays, 0));
      expect(firstDayValue).toBe(1);
    });

    it("should handle leap year correctly", () => {
      // Leap day
      const currentDate = toZonedDateTime("2024-02-29T00:00:00.000Z");
      // Sunday start
      const weekDays = getWeekDays(currentDate, 0);

      expect(weekDays).toHaveLength(7);

      const includesCurrentDate = weekDays.some((day) =>
        isSame(day, currentDate, "day")
      );

      expect(includesCurrentDate).toBeTruthy();
    });
  });

  describe("Real-world scenario: the reported bug", () => {
    it("should include Monday Oct 13 when firstDayOfWeek is Wednesday", () => {
      // Monday
      const currentDate = toZonedDateTime("2025-10-13T00:00:00.000Z");
      // Wednesday
      const firstDayOfWeek = 3;
      const weekDays = getWeekDays(currentDate, firstDayOfWeek);

      expect(weekDays).toHaveLength(7);
      // Starts with Wednesday
      expect(weekday(elementAt(weekDays, 0))).toBe(3);
      // Wed Oct 8
      expect(format(elementAt(weekDays, 0), "YYYY-MM-DD")).toBe("2025-10-08");

      const mondayIndex = weekDays.findIndex((day) =>
        isSame(day, currentDate, "day")
      );

      expect(mondayIndex).toBeGreaterThanOrEqual(0);
      expect(format(elementAt(weekDays, mondayIndex), "YYYY-MM-DD")).toBe(
        "2025-10-13"
      );
    });
  });

  describe("timezone preservation", () => {
    afterEach(() => {
      setDefaultTimeZone("UTC");
    });

    it("should preserve timezone offset on all generated days", () => {
      setDefaultTimeZone("Asia/Tokyo");

      const currentDate =
        toZonedDateTime("2026-03-12").withTimeZone("Asia/Tokyo");

      const weekDays = getWeekDays(currentDate, 0);

      for (const day of weekDays) {
        expect(day.offset).toBe("+09:00");
      }
    });

    it("should preserve timezone offset during DST transition week", () => {
      // March 8, 2026 is when NA DST starts — dayjs startOf('week') bug
      setDefaultTimeZone("Asia/Tokyo");

      const currentDate =
        toZonedDateTime("2026-03-08").withTimeZone("Asia/Tokyo");

      const weekDays = getWeekDays(currentDate, 0);

      for (const day of weekDays) {
        expect(day.offset).toBe("+09:00");
      }
    });
  });
});

describe(getMonthWeeks, () => {
  describe("timezone preservation", () => {
    afterEach(() => {
      setDefaultTimeZone("UTC");
    });

    it("should preserve timezone offset on all generated days", () => {
      setDefaultTimeZone("Asia/Tokyo");

      const currentDate =
        toZonedDateTime("2026-03-15").withTimeZone("Asia/Tokyo");

      const weeks = getMonthWeeks(currentDate, 0);

      for (const day of weeks.flat()) {
        expect(day.offset).toBe("+09:00");
      }
    });
  });
});

describe("timezone offset preservation (Temporal)", () => {
  const TOKYO_OFFSET = "+09:00";
  // March 8, 2026 is when NA DST starts (spring forward).
  // This date triggers the dayjs bug where startOf/endOf lose timezone info
  // when the system timezone observes DST near that date.
  const DST_DATE = "2026-03-08";

  afterEach(() => {
    setDefaultTimeZone("UTC");
  });

  describe(startOf, () => {
    it("should preserve timezone offset for startOf(day)", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const d = toZonedDateTime(DST_DATE).withTimeZone("Asia/Tokyo");
      const result = startOf(d, "day");

      expect(result.offset).toBe(TOKYO_OFFSET);
      expect(format(result, "YYYY-MM-DD")).toBe(DST_DATE);
      expect(result.hour).toBe(0);
      expect(result.minute).toBe(0);
      expect(result.second).toBe(0);
    });

    it("should preserve timezone offset for startOf(week)", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const d = toZonedDateTime(DST_DATE).withTimeZone("Asia/Tokyo");
      const result = startOf(d, "week");

      expect(result.offset).toBe(TOKYO_OFFSET);
      expect(result.hour).toBe(0);
    });

    it("should preserve timezone offset for startOf(month)", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const d = toZonedDateTime(DST_DATE).withTimeZone("Asia/Tokyo");
      const result = startOf(d, "month");

      expect(result.offset).toBe(TOKYO_OFFSET);
      expect(result.day).toBe(1);
      expect(result.hour).toBe(0);
    });

    it("should preserve timezone offset for startOf(hour)", () => {
      setDefaultTimeZone("Asia/Tokyo");

      const d = toZonedDateTime(DST_DATE)
        .withTimeZone("Asia/Tokyo")
        .with({ hour: 14, minute: 30 });

      const result = startOf(d, "hour");

      expect(result.offset).toBe(TOKYO_OFFSET);
      expect(result.hour).toBe(14);
      expect(result.minute).toBe(0);
    });

    it("should not alter dates when no timezone is set", () => {
      const d = toZonedDateTime("2026-06-15T10:30:00.000Z");
      const result = startOf(d, "day");
      const { offset } = result;

      // Without setDefault, should behave normally
      expect(result.hour).toBe(0);
      expect(result.offset).toBe(offset);
    });
  });

  describe(endOf, () => {
    it("should preserve timezone offset for endOf(day)", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const d = toZonedDateTime(DST_DATE).withTimeZone("Asia/Tokyo");
      const result = endOf(d, "day");

      expect(result.offset).toBe(TOKYO_OFFSET);
      expect(format(result, "YYYY-MM-DD")).toBe(DST_DATE);
      expect(result.hour).toBe(23);
      expect(result.minute).toBe(59);
      expect(result.second).toBe(59);
    });

    it("should preserve timezone offset for endOf(week)", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const d = toZonedDateTime(DST_DATE).withTimeZone("Asia/Tokyo");
      const result = endOf(d, "week");

      expect(result.offset).toBe(TOKYO_OFFSET);
      expect(result.hour).toBe(23);
      expect(result.minute).toBe(59);
    });

    it("should preserve timezone offset for endOf(month)", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const d = toZonedDateTime(DST_DATE).withTimeZone("Asia/Tokyo");
      const result = endOf(d, "month");

      expect(result.offset).toBe(TOKYO_OFFSET);
      // March has 31 days
      expect(result.day).toBe(31);
      expect(result.hour).toBe(23);
      expect(result.minute).toBe(59);
    });

    it("should preserve timezone offset for endOf(hour)", () => {
      setDefaultTimeZone("Asia/Tokyo");

      const d = toZonedDateTime(DST_DATE)
        .withTimeZone("Asia/Tokyo")
        .with({ hour: 14, minute: 30 });

      const result = endOf(d, "hour");

      expect(result.offset).toBe(TOKYO_OFFSET);
      expect(result.hour).toBe(14);
      expect(result.minute).toBe(59);
      expect(result.second).toBe(59);
    });
  });

  describe("chained operations", () => {
    it("should preserve offset through startOf().add() chains", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const d = toZonedDateTime(DST_DATE).withTimeZone("Asia/Tokyo");
      const result = startOf(d, "week").add({ days: 4 });

      expect(result.offset).toBe(TOKYO_OFFSET);
    });

    it("should preserve offset through weekday(startOf()) chains", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const d = toZonedDateTime(DST_DATE).withTimeZone("Asia/Tokyo");
      const result = startOf(d, "week").add({ days: 3 });

      expect(result.offset).toBe(TOKYO_OFFSET);
    });

    it("should preserve offset through startOf().startOf() chains", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const d = toZonedDateTime(DST_DATE).withTimeZone("Asia/Tokyo");
      const result = startOf(startOf(d, "week").add({ days: 4 }), "day");

      expect(result.offset).toBe(TOKYO_OFFSET);
      expect(result.hour).toBe(0);
    });
  });

  describe("isSame / comparison correctness", () => {
    it("should return true for isSame(now(), day) on today", () => {
      const today = now();
      expect(isSame(today, now(), "day")).toBeTruthy();
    });

    it("should return true for isSame with same day in timezone", () => {
      setDefaultTimeZone("Asia/Tokyo");

      const a = toZonedDateTime(DST_DATE)
        .withTimeZone("Asia/Tokyo")
        .with({ hour: 9 });

      const b = toZonedDateTime(DST_DATE)
        .withTimeZone("Asia/Tokyo")
        .with({ hour: 21 });

      expect(isSame(a, b, "day")).toBeTruthy();
    });

    it("should return false for isSame with different days", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const a = toZonedDateTime(DST_DATE).withTimeZone("Asia/Tokyo");
      const b = toZonedDateTime("2026-03-09").withTimeZone("Asia/Tokyo");

      expect(isSame(a, b, "day")).toBeFalsy();
    });
  });

  describe("unix timestamp preservation", () => {
    it("startOf should not change the represented moment beyond rounding", () => {
      setDefaultTimeZone("Asia/Tokyo");

      const d = toZonedDateTime(DST_DATE)
        .withTimeZone("Asia/Tokyo")
        .with({ hour: 14 });

      const startOfDay = startOf(d, "day");

      // Start of day in Tokyo should be midnight Tokyo time
      const expectedUnix = unix(
        toZonedDateTime(`${DST_DATE}T00:00:00`, "Asia/Tokyo")
      );

      expect(unix(startOfDay)).toBe(expectedUnix);
    });

    it("endOf should represent end of day in the correct timezone", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const d = toZonedDateTime(DST_DATE).withTimeZone("Asia/Tokyo");
      const endOfDay = endOf(d, "day");

      const expectedUnix = unix(
        toZonedDateTime(`${DST_DATE}T23:59:59`, "Asia/Tokyo")
      );

      expect(unix(endOfDay)).toBe(expectedUnix);
    });
  });

  describe("non-DST dates", () => {
    it("should work correctly for dates far from DST transitions", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const d = toZonedDateTime("2026-06-15").withTimeZone("Asia/Tokyo");

      expect(startOf(d, "day").offset).toBe(TOKYO_OFFSET);
      expect(endOf(d, "day").offset).toBe(TOKYO_OFFSET);
      expect(startOf(d, "week").offset).toBe(TOKYO_OFFSET);
      expect(endOf(d, "day").hour).toBe(23);
      expect(endOf(d, "day").minute).toBe(59);
    });
  });

  describe("default timezone via setDefault", () => {
    it("should apply fix using setDefault timezone even without explicit .tz()", () => {
      setDefaultTimeZone("Asia/Tokyo");
      // Create date via the timezone-aware constructor (no explicit .tz())
      const d = toZonedDateTime(DST_DATE);
      const result = startOf(d, "day");

      expect(result.offset).toBe(TOKYO_OFFSET);
    });

    it("should stop applying fix after setDefault is cleared", () => {
      setDefaultTimeZone("Asia/Tokyo");
      const d1 = toZonedDateTime(DST_DATE).withTimeZone("Asia/Tokyo");
      expect(startOf(d1, "day").offset).toBe(TOKYO_OFFSET);

      setDefaultTimeZone("UTC");
      // After clearing, the plugin should not force any timezone
      const d2 = toZonedDateTime("2026-06-15");
      const result = startOf(d2, "day");
      // Should not force Tokyo offset
      expect(format(result, "HH:mm")).toBe("00:00");
    });
  });
});
