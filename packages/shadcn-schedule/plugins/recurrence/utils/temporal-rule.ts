import { RRuleTemporal } from "rrule-temporal";
import { Temporal } from "temporal-polyfill";

import type { RRuleOptions, Weekday } from "@/plugins/recurrence/types";
import {
  FREQUENCY_NAMES,
  WEEKDAY_NAMES,
  isWeekday,
} from "@/plugins/recurrence/utils/recurrence-constants";

// The calendar stores wall-clock times in Date objects ("floating time":
// a UTC Date whose components are the user's local components). rrule-temporal
// works on ZonedDateTimes, so dates are lifted into a UTC zone carrying those
// same wall components. Rules evaluate in that floating space and occurrences
// convert straight back to the same wall-clock Dates.
const toFloatingZonedDateTime = (date: Date): Temporal.ZonedDateTime =>
  Temporal.ZonedDateTime.from({
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    millisecond: date.getUTCMilliseconds(),
    minute: date.getUTCMinutes(),
    month: date.getUTCMonth() + 1,
    second: date.getUTCSeconds(),
    timeZone: "UTC",
    year: date.getUTCFullYear(),
  });

// Reverts a floating ZonedDateTime occurrence to the wall-clock Date it
// represents.
export const toFloatingDateFromZoned = (zoned: {
  epochMilliseconds: number;
}): Date => new Date(zoned.epochMilliseconds);

const toNumberList = (
  value: number | number[] | null | undefined
): number[] | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
};

/** A bare weekday number and a `Weekday` object describe the same day. */
const toWeekday = (value: Weekday | number): Weekday =>
  isWeekday(value) ? value : { weekday: value };

// rrule weekday value (object with 0 = Monday … 6 = Sunday, number, array or
// absent) → the BYDAY tokens rrule-temporal expects ("MO", "2MO", "-1SU").
const toByDayList = (
  byweekday: RRuleOptions["byweekday"]
): string[] | undefined => {
  if (byweekday === undefined || byweekday === null) {
    return undefined;
  }

  const values = Array.isArray(byweekday) ? byweekday : [byweekday];

  return values.map((value) => {
    const { n, weekday } = toWeekday(value);
    const name = WEEKDAY_NAMES[weekday];

    if (!name) {
      throw new Error(`Invalid BYDAY weekday: ${weekday}`);
    }

    return `${n === undefined ? "" : String(n)}${name}`;
  });
};

// Builds the rrule-temporal engine for a persisted rrule-shaped options object.
// Callers wrap this in try/catch: invalid frequencies/options throw here.
export const toTemporalRule = (opts: RRuleOptions): RRuleTemporal => {
  const freqName = FREQUENCY_NAMES[opts.freq];

  if (freqName === undefined) {
    throw new Error(`Invalid RRULE frequency: ${opts.freq}`);
  }

  // The editor's intermediate states carry no dtstart yet; rrule defaults
  // it to now, so the engine tolerates a missing one the same way.
  const dtstart: Date | undefined = opts.dtstart;

  return new RRuleTemporal({
    byDay: toByDayList(opts.byweekday),
    byHour: toNumberList(opts.byhour),
    byMinute: toNumberList(opts.byminute),
    byMonth: toNumberList(opts.bymonth),
    byMonthDay: toNumberList(opts.bymonthday),
    bySecond: toNumberList(opts.bysecond),
    bySetPos: toNumberList(opts.bysetpos),
    byWeekNo: toNumberList(opts.byweekno),
    byYearDay: toNumberList(opts.byyearday),
    count: opts.count ?? undefined,
    dtstart: toFloatingZonedDateTime(dtstart ?? new Date()),
    freq: freqName,
    interval: opts.interval,
    until: opts.until ? toFloatingZonedDateTime(opts.until) : undefined,
    wkst: opts.wkst === undefined ? undefined : toByDayList(opts.wkst)?.at(0),
  });
};

// Canonical `RRULE:` line for iCal exports. rrule-temporal's toString() emits
// the full DTSTART + RRULE pair with a fixed part order, so the RRULE part is
// stable regardless of how the caller's options object was written. Invalid
// rules yield an empty string rather than throwing.
export const toRRuleLine = (opts: RRuleOptions): string => {
  try {
    const text = toTemporalRule(opts).toString();

    return text.split("\n").find((line) => line.startsWith("RRULE:")) ?? "";
  } catch {
    return "";
  }
};
