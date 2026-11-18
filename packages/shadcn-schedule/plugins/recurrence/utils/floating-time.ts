import type { Temporal } from "temporal-polyfill";

/**
 * Converts a ZonedDateTime to a "Floating Time" Date representation: a UTC
 * Date whose components match the value's wall-clock components.
 *
 * This is essential for RRule evaluation because it ensures that a rule
 * like "Every Wednesday" refers to the user's local Wednesday, even if
 * that time falls on a Thursday in actual UTC.
 */
export const toFloatingDate = (d: Temporal.ZonedDateTime): Date =>
  new Date(
    Date.UTC(
      d.year,
      d.month - 1,
      d.day,
      d.hour,
      d.minute,
      d.second,
      d.millisecond
    )
  );

/**
 * Converts a "Floating Time" Date back to a ZonedDateTime in the original
 * context: the YMDHMS components of the UTC Date are applied to the reference
 * value, preserving its timezone.
 */
export const fromFloatingDate = (
  date: Date,
  reference: Temporal.ZonedDateTime
): Temporal.ZonedDateTime =>
  reference.with({
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    microsecond: 0,
    millisecond: date.getUTCMilliseconds(),
    minute: date.getUTCMinutes(),
    month: date.getUTCMonth() + 1,
    nanosecond: 0,
    second: date.getUTCSeconds(),
    year: date.getUTCFullYear(),
  });
