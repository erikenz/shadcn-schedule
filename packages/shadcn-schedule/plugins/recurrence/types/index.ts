/**
 * Scope options for recurring event operations (Google Calendar style)
 * Determines how many events in a recurring series should be affected
 */
export type RecurrenceEditScope =
  // Only this specific event instance
  | "this"
  // This event and all following events in the series
  | "following"
  // All events in the recurring series
  | "all";

/**
 * A weekday within a recurrence rule: 0 = Sunday … 6 = Saturday, with an
 * optional occurrence number for MONTHLY/YEARLY rules ({ weekday: 1, n: 2 }
 * = second Monday, n: -1 = last). This is the persisted shape events carry;
 * it mirrors rrule.js' Weekday so stored data stays compatible.
 */
export interface Weekday {
  n?: number;
  weekday: number;
}

/**
 * Recurrence rule options stored on events (rrule-compatible shape): numeric
 * frequency code (0 = YEARLY … 6 = SECONDLY, see `FREQ` in
 * `utils/recurrence-constants`) and RFC 5545 rule parts. Only `freq` is
 * required: the editor's intermediate states omit `dtstart` (the form section
 * anchors it to the event's start, and the engine defaults it to now).
 */
export interface RRuleOptions {
  byhour?: number | number[];
  byminute?: number | number[];
  bymonth?: number | number[];
  bymonthday?: number | number[] | null;
  bysecond?: number | number[];
  bysetpos?: number | number[];
  byweekday?: Weekday | Weekday[] | number | number[] | null;
  byweekno?: number | number[];
  byyearday?: number | number[];
  count?: number | null;
  /**
   * The start date of the recurrence rule. This defines when the recurrence pattern begins.
   * Recommended for proper RRULE functionality according to RFC 5545.
   * Kept in sync with the event start date.
   */
  dtstart?: Date;
  /**
   * The frequency of the event. Must be one of the following: DAILY, WEEKLY, MONTHLY, etc.
   */
  freq: number;
  interval?: number;
  until?: Date | null;
  wkst?: Weekday | number;
}
