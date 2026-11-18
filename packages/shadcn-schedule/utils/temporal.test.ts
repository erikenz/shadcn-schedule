import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
  diff,
  endOf,
  format,
  isSame,
  isSameOrAfter,
  isSameOrBefore,
  now,
  setDefaultTimeZone,
  startOf,
  toDate,
  toISOString,
  toZonedDateTime,
  unix,
  weekday,
} from "@/utils/temporal";

describe("temporal utils", () => {
  it("parses wall time in the default zone (UTC)", () => {
    const z = toZonedDateTime("2025-01-06T09:00:00");
    expect(z.toString()).toBe("2025-01-06T09:00:00+00:00[UTC]");
  });

  it("parses Z-suffixed instants into the default zone", () => {
    const z = toZonedDateTime("2025-01-06T09:00:00Z");
    expect(z.hour).toBe(9);
    expect(z.timeZoneId).toBe("UTC");
  });

  it("keeps bracketed zones", () => {
    const z = toZonedDateTime("2025-01-06T09:00:00[America/New_York]");
    expect(z.timeZoneId).toBe("America/New_York");
  });

  it("converts to a target zone", () => {
    const z = toZonedDateTime("2025-01-06T09:00:00Z", "America/New_York");
    expect(z.hour).toBe(4);
    expect(z.timeZoneId).toBe("America/New_York");
  });

  it("parses Dates and epoch ms", () => {
    const fromDate = toZonedDateTime(new Date("2025-01-06T09:00:00Z"));
    const fromMs = toZonedDateTime(Date.parse("2025-01-06T09:00:00Z"));
    expect(fromDate.epochMilliseconds).toBe(fromMs.epochMilliseconds);
  });

  it("passes ZonedDateTimes through", () => {
    const z = Temporal.ZonedDateTime.from("2025-01-06T09:00:00[UTC]");
    expect(toZonedDateTime(z)).toBe(z);
  });

  it("formats numeric date tokens", () => {
    const z = toZonedDateTime("2025-01-06T09:05:00Z");
    expect(format(z, "YYYY-MM-DD")).toBe("2025-01-06");
    expect(format(z, "D")).toBe("6");
    expect(format(z, "MM")).toBe("01");
    expect(format(z, "YYYY-MM")).toBe("2025-01");
    expect(format(z, "YYYY")).toBe("2025");
  });

  it("formats numeric time tokens and escaped literals", () => {
    const z = toZonedDateTime("2025-01-06T09:05:00Z");
    expect(format(z, "HH:mm")).toBe("09:05");
    expect(format(z, "YYYY-MM-DD HH:mm:ss")).toBe("2025-01-06 09:05:00");
    expect(format(z, "YYYY-MM-DDTHH:mm")).toBe("2025-01-06T09:05");
    expect(format(z, "YYYYMMDD[T]HHmmss[Z]")).toBe("20250106T090500Z");
  });

  it("formats weekday names", () => {
    const z = toZonedDateTime("2025-01-06T09:05:00Z");
    expect(format(z, "dddd")).toBe("Monday");
    expect(format(z, "ddd")).toBe("Mon");
    expect(format(z, "dd")).toBe("Mo");
  });

  it("formats month names", () => {
    const z = toZonedDateTime("2025-01-06T09:05:00Z");
    expect(format(z, "MMMM")).toBe("January");
    expect(format(z, "MMM")).toBe("Jan");
    expect(format(z, "MMMM D, YYYY")).toBe("January 6, 2025");
  });

  it("startOf/endOf day and hour (UTC)", () => {
    const z = toZonedDateTime("2025-01-06T14:30:45.123Z");
    expect(format(startOf(z, "day"), "YYYY-MM-DD HH:mm:ss")).toBe(
      "2025-01-06 00:00:00"
    );
    expect(toISOString(endOf(z, "day"))).toBe("2025-01-06T23:59:59.999Z");
    expect(format(startOf(z, "hour"), "HH:mm")).toBe("14:00");
    expect(format(endOf(z, "hour"), "HH:mm:ss")).toBe("14:59:59");
  });

  it("startOf/endOf month and year (UTC)", () => {
    const z = toZonedDateTime("2025-01-06T14:30:45.123Z");
    expect(format(startOf(z, "month"), "YYYY-MM-DD")).toBe("2025-01-01");
    expect(format(endOf(z, "month"), "YYYY-MM-DD")).toBe("2025-01-31");
    expect(format(startOf(z, "year"), "YYYY-MM-DD")).toBe("2025-01-01");
  });

  it("startOf/endOf week is Sunday-based (UTC)", () => {
    const z = toZonedDateTime("2025-01-06T14:30:45.123Z");
    // 2025-01-06 is a Monday; Sunday-based week start = 2025-01-05
    expect(format(startOf(z, "week"), "YYYY-MM-DD")).toBe("2025-01-05");
    expect(format(endOf(z, "week"), "YYYY-MM-DD")).toBe("2025-01-11");
  });

  it("diff is float like dayjs", () => {
    const a = toZonedDateTime("2025-01-06T09:00:30Z");
    const b = toZonedDateTime("2025-01-06T09:00:00Z");
    expect(diff(a, b, "second")).toBe(30);
    expect(diff(b, a, "second")).toBe(-30);
    expect(
      diff(
        toZonedDateTime("2025-01-08T09:00:00Z"),
        toZonedDateTime("2025-01-06T09:00:00Z"),
        "day"
      )
    ).toBe(2);
  });

  it("isSame units", () => {
    const a = toZonedDateTime("2025-01-06T09:00:00Z");
    const b = toZonedDateTime("2025-01-06T23:00:00Z");
    expect(isSame(a, b, "day")).toBeTruthy();
    expect(isSame(a, b)).toBeFalsy();
  });

  it("isSameOrBefore / isSameOrAfter", () => {
    const a = toZonedDateTime("2025-01-06T09:00:00Z");
    const b = toZonedDateTime("2025-01-06T09:00:00Z");
    expect(isSameOrBefore(a, b)).toBeTruthy();
    expect(isSameOrAfter(a, b)).toBeTruthy();
  });

  it("toISOString/toDate/unix/weekday", () => {
    const z = toZonedDateTime("2025-01-06T09:00:00Z");
    expect(toISOString(z)).toBe("2025-01-06T09:00:00.000Z");
    expect(toDate(z).toISOString()).toBe("2025-01-06T09:00:00.000Z");
    expect(unix(z)).toBe(1_736_154_000);
    // Monday
    expect(weekday(z)).toBe(1);
    // Sunday
    expect(weekday(toZonedDateTime("2025-01-05T09:00:00Z"))).toBe(0);
  });

  it("default timezone switching", () => {
    setDefaultTimeZone("America/New_York");
    const z = toZonedDateTime("2025-01-06T09:00:00");
    expect(z.timeZoneId).toBe("America/New_York");
    expect(z.hour).toBe(9);
    setDefaultTimeZone("UTC");
  });

  it("now() respects default zone", () => {
    setDefaultTimeZone("UTC");
    expect(now().timeZoneId).toBe("UTC");
  });
});
