import type { Weekday } from "@/plugins/recurrence/types";

/**
 * Numeric frequency codes of the persisted rrule shape (RFC 5545 frequencies
 * numbered as rrule.js does). Kept stable: these values are stored on events
 * and are independent of the recurrence engine used to evaluate them.
 */
export const FREQ = {
  DAILY: 3,
  HOURLY: 4,
  MINUTELY: 5,
  MONTHLY: 1,
  SECONDLY: 6,
  WEEKLY: 2,
  YEARLY: 0,
} as const;

// Frequency names indexed by the numeric code above.
export const FREQUENCY_NAMES = [
  "YEARLY",
  "MONTHLY",
  "WEEKLY",
  "DAILY",
  "HOURLY",
  "MINUTELY",
  "SECONDLY",
] as const;

// Weekday objects in the persisted rrule shape (0 = Monday … 6 = Sunday, the
// rrule.js numbering). Stable references so the editor's
// identity-based membership checks keep working.
export const WEEKDAYS = {
  FR: { weekday: 4 },
  MO: { weekday: 0 },
  SA: { weekday: 5 },
  SU: { weekday: 6 },
  TH: { weekday: 3 },
  TU: { weekday: 1 },
  WE: { weekday: 2 },
} as const;

// Weekday names indexed by the numeric code above.
export const WEEKDAY_NAMES = [
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
  "SU",
] as const;

// All weekdays in display order (0 = Sunday … 6 = Saturday).
export const WEEKDAY_ORDER = [
  WEEKDAYS.SU,
  WEEKDAYS.MO,
  WEEKDAYS.TU,
  WEEKDAYS.WE,
  WEEKDAYS.TH,
  WEEKDAYS.FR,
  WEEKDAYS.SA,
];

// The n-th occurrence of a weekday within a MONTHLY/YEARLY rule (n = -1 = last).
export const withNth = (weekday: Weekday, n: number): Weekday => ({
  n,
  weekday: weekday.weekday,
});

/**
 * Narrows a byweekday entry to its object form. The bare-number form is
 * shorthand for a weekday with no occurrence number.
 */
export const isWeekday = (value: Weekday | number): value is Weekday =>
  typeof value === "object" && value !== null;
