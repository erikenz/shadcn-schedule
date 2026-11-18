import { Temporal } from "temporal-polyfill";

/**
 * The calendar's date-time backbone: Temporal.ZonedDateTime.
 *
 * Events carry wall-clock times in their own time zone (the calendar's
 * configured zone, defaulting to the system zone — the Temporal replacement
 * for the old dayjs default-timezone setup). All helpers below are pure
 * functions over ZonedDateTime; nothing in the package mutates dates.
 */

// ---- timezone & locale configuration ----

let defaultTimeZone = Temporal.Now.timeZoneId();

let defaultLocale = "en";

interface MonthAndDayNames {
  days: string[];
  daysShort: string[];
  months: string[];
  monthsShort: string[];
}

// Cached Intl names per locale; cleared when the locale changes.
const namesCache = new Map<string, MonthAndDayNames>();

// Test-only clock override so `now()` is deterministic where tests assert
// today/current-time behavior (Temporal.Now is not controllable by fake timers).
let nowOverride: Temporal.ZonedDateTime | null = null;

/** Sets the zone used when parsing zone-less inputs (was dayjs.tz.setDefault). */
export const setDefaultTimeZone = (timeZone: string): void => {
  defaultTimeZone = timeZone;
};

/** The zone used when parsing zone-less inputs. */
export const getDefaultTimeZone = (): string => defaultTimeZone;

/** Pins `now()` to a fixed instant until `resetNow()` (test only). */
export const setNow = (value: Temporal.ZonedDateTime): void => {
  nowOverride = value;
};

/** Restores the real wall clock (test only). */
export const resetNow = (): void => {
  nowOverride = null;
};

/** Sets the locale used by `format` for month/weekday names (was dayjs.locale). */
export const setDefaultLocale = (locale: string): void => {
  defaultLocale = locale;
  namesCache.clear();
};

// ---- construction ----

/** The current instant in the given zone (defaults to the calendar zone). */
export const now = (
  timeZone: string = defaultTimeZone
): Temporal.ZonedDateTime =>
  nowOverride?.withTimeZone(timeZone) ??
  Temporal.Now.zonedDateTimeISO(timeZone);

export type DateTimeInput =
  | string
  | number
  | Date
  | Temporal.ZonedDateTime
  | undefined;

/** Already a ZonedDateTime (of the Temporal implementation this package uses). */
const isZonedDateTime = (
  value: DateTimeInput
): value is Temporal.ZonedDateTime => value instanceof Temporal.ZonedDateTime;

/** Epoch-milliseconds input (dayjs' numeric timestamps). */
const isEpochMilliseconds = (value: DateTimeInput): value is number =>
  typeof value === "number";

/**
 * Matches ISO strings with a UTC designator or explicit offset (e.g. "...Z"
 * or "...+09:00"): those carry their own zone, so they parse as instants.
 */
const HAS_ZONE_SUFFIX = /[zZ]$|[+-]\d{2}:\d{2}/u;

/**
 * Parses anything the calendar accepts into a ZonedDateTime:
 * - ZonedDateTime passes through unchanged (any Temporal implementation)
 * - Date / epoch-milliseconds: the instant it represents, in `timeZone`
 * - ISO strings with an offset or bracket zone: the instant, in `timeZone`
 * - zone-less ISO strings: wall time interpreted in `timeZone`
 */
export const toZonedDateTime = (
  input: DateTimeInput,
  timeZone: string = defaultTimeZone
): Temporal.ZonedDateTime => {
  if (input === undefined) {
    return now(timeZone);
  }

  if (isZonedDateTime(input)) {
    return input;
  }

  if (isEpochMilliseconds(input)) {
    return Temporal.Instant.fromEpochMilliseconds(input).toZonedDateTimeISO(
      timeZone
    );
  }

  if (input instanceof Date) {
    return Temporal.Instant.fromEpochMilliseconds(
      input.getTime()
    ).toZonedDateTimeISO(timeZone);
  }

  if (input.includes("[")) {
    return Temporal.ZonedDateTime.from(input);
  }

  if (HAS_ZONE_SUFFIX.test(input)) {
    return Temporal.Instant.from(input).toZonedDateTimeISO(timeZone);
  }

  return Temporal.PlainDateTime.from(input).toZonedDateTime(timeZone);
};

// ---- comparisons ----

export type CompareUnit = "hour" | "day" | "week" | "month" | "year";

/**
 * Adds `amount` of the given unit (dayjs' add/subtract units), e.g.
 * `addDuration(date, 2, "week")`. Weeks are calendar weeks; the other units
 * are calendar-accurate (DST-safe) durations.
 */
export const addDuration = (
  zdt: Temporal.ZonedDateTime,
  amount: number,
  unit: DiffUnit
): Temporal.ZonedDateTime => {
  switch (unit) {
    case "hour": {
      return zdt.add({ hours: amount });
    }

    case "day": {
      return zdt.add({ days: amount });
    }

    case "week": {
      return zdt.add({ weeks: amount });
    }

    case "month": {
      return zdt.add({ months: amount });
    }

    case "year": {
      return zdt.add({ years: amount });
    }

    case "minute": {
      return zdt.add({ minutes: amount });
    }

    case "second": {
      return zdt.add({ seconds: amount });
    }

    case "millisecond": {
      return zdt.add({ milliseconds: amount });
    }

    default: {
      throw new Error(`Unsupported unit: ${String(unit)}`);
    }
  }
};

/** Truncates a ZonedDateTime to the start of the given unit, in its zone. */
export const startOf = (
  zdt: Temporal.ZonedDateTime,
  unit: CompareUnit
): Temporal.ZonedDateTime => {
  switch (unit) {
    case "hour": {
      return zdt.with({
        microsecond: 0,
        millisecond: 0,
        minute: 0,
        nanosecond: 0,
        second: 0,
      });
    }

    case "day": {
      return zdt.startOfDay();
    }

    // dayjs' startOf("week") is Sunday-based; kept for parity.
    case "week": {
      return zdt.subtract({ days: zdt.dayOfWeek % 7 }).startOfDay();
    }

    case "month": {
      return zdt.with({
        day: 1,
        hour: 0,
        microsecond: 0,
        millisecond: 0,
        minute: 0,
        nanosecond: 0,
        second: 0,
      });
    }

    case "year": {
      return zdt.with({
        day: 1,
        hour: 0,
        microsecond: 0,
        millisecond: 0,
        minute: 0,
        month: 1,
        nanosecond: 0,
        second: 0,
      });
    }

    default: {
      throw new Error(`Unsupported unit: ${String(unit)}`);
    }
  }
};

/** Adds `amount` of the given unit (the unit used by endOf's "next unit" step). */
const addUnit = (
  zdt: Temporal.ZonedDateTime,
  amount: number,
  unit: Exclude<CompareUnit, "week">
): Temporal.ZonedDateTime => {
  switch (unit) {
    case "hour": {
      return zdt.add({ hours: amount });
    }

    case "day": {
      return zdt.add({ days: amount });
    }

    case "month": {
      return zdt.add({ months: amount });
    }

    case "year": {
      return zdt.add({ years: amount });
    }

    default: {
      throw new Error(`Unsupported unit: ${String(unit)}`);
    }
  }
};

/** Truncates a ZonedDateTime to the last instant of the given unit. */
export const endOf = (
  zdt: Temporal.ZonedDateTime,
  unit: CompareUnit
): Temporal.ZonedDateTime => {
  if (unit === "week") {
    return endOf(startOf(zdt, "week").add({ days: 6 }), "day");
  }

  return addUnit(startOf(zdt, unit), 1, unit).subtract({ nanoseconds: 1 });
};

/** Instant equality, or same calendar unit in each value's own zone. */
export const isSame = (
  a: Temporal.ZonedDateTime,
  b: Temporal.ZonedDateTime,
  unit?: CompareUnit
): boolean =>
  unit === undefined
    ? a.epochNanoseconds === b.epochNanoseconds
    : startOf(a, unit).epochNanoseconds === startOf(b, unit).epochNanoseconds;

/** Instant comparison: a < b. */
export const isBefore = (
  a: Temporal.ZonedDateTime,
  b: Temporal.ZonedDateTime
): boolean => Temporal.ZonedDateTime.compare(a, b) < 0;

/** Instant comparison: a > b. */
export const isAfter = (
  a: Temporal.ZonedDateTime,
  b: Temporal.ZonedDateTime
): boolean => Temporal.ZonedDateTime.compare(a, b) > 0;

export const isSameOrBefore = (
  a: Temporal.ZonedDateTime,
  b: Temporal.ZonedDateTime
): boolean => Temporal.ZonedDateTime.compare(a, b) <= 0;

export const isSameOrAfter = (
  a: Temporal.ZonedDateTime,
  b: Temporal.ZonedDateTime
): boolean => Temporal.ZonedDateTime.compare(a, b) >= 0;

export const maxDateTime = (
  a: Temporal.ZonedDateTime,
  b: Temporal.ZonedDateTime
): Temporal.ZonedDateTime =>
  Temporal.ZonedDateTime.compare(a, b) >= 0 ? a : b;

export const minDateTime = (
  a: Temporal.ZonedDateTime,
  b: Temporal.ZonedDateTime
): Temporal.ZonedDateTime =>
  Temporal.ZonedDateTime.compare(a, b) <= 0 ? a : b;

export type DiffUnit = CompareUnit | "minute" | "second" | "millisecond";

/**
 * a − b in the given unit (dayjs' diff semantics): whole units truncated
 * toward zero, or the exact float total when `float` is true (dayjs' third
 * diff argument). Calendar days/weeks/months/years are exact calendar
 * arithmetic, not fixed 24h spans.
 */
export const diff = (
  a: Temporal.ZonedDateTime,
  b: Temporal.ZonedDateTime,
  unit: DiffUnit = "millisecond",
  float = false
): number => {
  const total = b.until(a, { largestUnit: unit }).total({ unit });

  return float ? total : Math.trunc(total);
};

// ---- conversions & accessors ----

/** The instant as a UTC ISO string, always with millisecond digits, e.g.
 * "2025-01-06T09:00:00.000Z" (matches dayjs' toISOString, which event
 * override/exdate string matching relies on). */
export const toISOString = (zdt: Temporal.ZonedDateTime): string =>
  Temporal.Instant.fromEpochMilliseconds(zdt.epochMilliseconds).toString({
    fractionalSecondDigits: 3,
  });

/** The instant as a JavaScript Date. */
export const toDate = (zdt: Temporal.ZonedDateTime): Date =>
  new Date(zdt.epochMilliseconds);

/** Seconds since the epoch (dayjs .unix()). */
export const unix = (zdt: Temporal.ZonedDateTime): number =>
  Math.trunc(zdt.epochMilliseconds / 1000);

/** Day of week, 0 = Sunday … 6 = Saturday (dayjs .day()/.weekday()). */
export const weekday = (zdt: Temporal.ZonedDateTime): number =>
  zdt.dayOfWeek % 7;

/** 0-based month index, 0 = January (dayjs .month()). */
export const monthIndex = (zdt: Temporal.ZonedDateTime): number =>
  zdt.month - 1;

// ---- formatting ----

const getNames = (): MonthAndDayNames => {
  const cached = namesCache.get(defaultLocale);

  if (cached) {
    return cached;
  }

  // A known Monday (2024-01-01) so the day arrays index by ISO dayOfWeek 1-7.
  const dayFormatter = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(defaultLocale, options);

  const names: MonthAndDayNames = {
    days: Array.from({ length: 7 }, (_, i) =>
      dayFormatter({ weekday: "long" }).format(new Date(2024, 0, 1 + i))
    ),
    daysShort: Array.from({ length: 7 }, (_, i) =>
      dayFormatter({ weekday: "short" }).format(new Date(2024, 0, 1 + i))
    ),
    months: Array.from({ length: 12 }, (_, i) =>
      dayFormatter({ month: "long" }).format(new Date(2024, i, 1))
    ),
    monthsShort: Array.from({ length: 12 }, (_, i) =>
      dayFormatter({ month: "short" }).format(new Date(2024, i, 1))
    ),
  };

  namesCache.set(defaultLocale, names);

  return names;
};

/**
 * An Intl name by index. The name arrays are built at a fixed length, so a
 * missing entry means the caller passed an out-of-range month/day index.
 */
const nameAt = (names: string[], index: number): string => {
  const name = names[index];

  if (name === undefined) {
    throw new Error(`Missing Intl name at index ${index}`);
  }

  return name;
};

// Token alternation is longest-first and the bracket escape cannot overlap a
// token letter, so matching stays linear; the rule still flags the alternation.
const FORMAT_TOKEN =
  // oxlint-disable-next-line sonarjs/super-linear-regex -- see the note above
  /(?:\[[^\]]*\]|YYYY|MMMM|MMM|MM|DD|dddd|ddd|dd|D|HH|H|h|A|mm|ss|Z)/gu;

/**
 * Formats a ZonedDateTime with dayjs-style tokens: YYYY MM MMM MMMM DD D
 * ddd dddd HH mm ss Z, plus `[literal]` escapes. Unrecognized characters pass
 * through. Month/weekday names follow the configured locale.
 */
export const format = (
  zdt: Temporal.ZonedDateTime,
  pattern = "YYYY-MM-DDTHH:mm:ssZ"
): string => {
  const names = getNames();

  return pattern.replaceAll(FORMAT_TOKEN, (token) => {
    if (token.startsWith("[")) {
      return token.slice(1, -1);
    }

    switch (token) {
      case "YYYY": {
        return String(zdt.year).padStart(4, "0");
      }

      case "MM": {
        return String(zdt.month).padStart(2, "0");
      }

      case "MMM": {
        return nameAt(names.monthsShort, zdt.month - 1);
      }

      case "MMMM": {
        return nameAt(names.months, zdt.month - 1);
      }

      case "DD": {
        return String(zdt.day).padStart(2, "0");
      }

      case "D": {
        return String(zdt.day);
      }

      case "ddd": {
        return nameAt(names.daysShort, zdt.dayOfWeek - 1);
      }

      case "dd": {
        return nameAt(names.daysShort, zdt.dayOfWeek - 1).slice(0, 2);
      }

      case "dddd": {
        return nameAt(names.days, zdt.dayOfWeek - 1);
      }

      case "HH": {
        return String(zdt.hour).padStart(2, "0");
      }

      case "H": {
        return String(zdt.hour);
      }

      case "h": {
        return String(((zdt.hour + 11) % 12) + 1);
      }

      case "A": {
        return zdt.hour < 12 ? "AM" : "PM";
      }

      case "mm": {
        return String(zdt.minute).padStart(2, "0");
      }

      case "ss": {
        return String(zdt.second).padStart(2, "0");
      }

      case "Z": {
        return zdt.offset;
      }

      default: {
        return token;
      }
    }
  });
};
