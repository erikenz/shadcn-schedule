import type { Temporal } from "temporal-polyfill";

import { WEEK_DAYS_NUMBER_MAP } from "@/lib/constants";
import { hasNumber } from "@/lib/guards";
import type { BusinessHours } from "@/types/index";
import { weekday } from "@/utils/temporal";

const TIME_STRING_PATTERN = /^(?<hours>\d{1,2}):(?<minutes>\d{2})$/u;

/** A business-hours boundary in either supported form. */
type HourBoundary = number | string | undefined;

/** The whole-hour boundary form (e.g. `9`, `17`). */
const isHourNumber = (value: HourBoundary): value is number =>
  typeof value === "number";

/** The 'HH:mm' boundary form. */
const isClockTime = (value: HourBoundary): value is string =>
  typeof value === "string";

/**
 * Normalizes a business-hours boundary to minutes since midnight. Numbers are
 * whole 24-hour values (fractions round to the nearest hour — decimal hours
 * are NOT supported); sub-hour boundaries use 'HH:mm' strings. Malformed
 * strings fall back to the given default hour.
 */
const toBoundaryMinutes = (
  value: number | string | undefined,
  fallbackHours: number
): number => {
  if (isHourNumber(value)) {
    return Math.round(value) * 60;
  }

  const groups = isClockTime(value)
    ? TIME_STRING_PATTERN.exec(value)?.groups
    : undefined;

  if (!groups) {
    return fallbackHours * 60;
  }

  const hours = Number(groups.hours);
  const minutes = Number(groups.minutes);
  const withinDay = hours * 60 + minutes <= 24 * 60;

  if (minutes <= 59 && withinDay) {
    return hours * 60 + minutes;
  }

  return fallbackHours * 60;
};

/**
 * Unwraps a business-hours window into [start, end) minutes where end > start
 * and end - start <= 24h (both boundaries are within a single clock day, so
 * the span is inherently capped). `endTime < startTime` means the window
 * crosses midnight (e.g. "13:00" - "01:00" = 13:00 → 01:00 the next day).
 * Equal boundaries mean the config is closed (no open time).
 */
const unwrapWindow = (
  config: BusinessHours
): { start: number; end: number } | null => {
  const start = toBoundaryMinutes(config.startTime, 9);
  const end = toBoundaryMinutes(config.endTime, 17);

  if (start === end) {
    return null;
  }

  return end < start ? { end: end + 24 * 60, start } : { end, start };
};

interface IsBusinessHourOptions {
  businessHours?: BusinessHours | BusinessHours[];
  date: Temporal.ZonedDateTime;
  /**
   * When set, the check covers the whole slot [hour:minute, +durationMinutes):
   * the slot counts as business only if it fits entirely inside a config's
   * range. Without it, the check is a point-in-range test.
   */
  durationMinutes?: number;
  hour?: number;
  minute?: number;
}

/**
 * Whether a slot [currentMinutes, +durationMinutes) fits entirely inside one
 * unwrapped window. Overnight windows (end > 24h) are tested against their
 * clock projection [start, 24h) ∪ [0, tail): a slot crossing midnight must fit
 * its head part in the head and its tail part in the tail, because the window
 * is continuous across midnight.
 */
const isWithinWindow = (
  currentMinutes: number,
  durationMinutes: number | undefined,
  window: { end: number; start: number }
): boolean => {
  const cellEnd = currentMinutes + (durationMinutes ?? 0);

  if (window.end <= 24 * 60) {
    return hasNumber(durationMinutes)
      ? currentMinutes >= window.start && cellEnd <= window.end
      : currentMinutes >= window.start && currentMinutes < window.end;
  }

  const tailEnd = window.end - 24 * 60;

  if (
    durationMinutes === undefined ||
    durationMinutes === 0 ||
    Number.isNaN(durationMinutes)
  ) {
    return currentMinutes >= window.start || currentMinutes < tailEnd;
  }

  if (cellEnd <= 24 * 60) {
    // Slot stays on one side of midnight: inside the head or the tail.
    return currentMinutes >= window.start || cellEnd <= tailEnd;
  }

  // Slot crosses midnight: the head part must fit the head and the tail part
  // the tail.
  return currentMinutes >= window.start && cellEnd - 24 * 60 <= tailEnd;
};

/**
 * Helper to process a business hours configuration and update the range.
 */
const processBusinessHours = (
  bh: BusinessHours | BusinessHours[] | undefined,
  options: {
    date?: Temporal.ZonedDateTime;
    onMatch: (config: BusinessHours) => void;
  }
) => {
  const { date, onMatch } = options;

  if (!bh) {
    return;
  }

  const configs = Array.isArray(bh) ? bh : [bh];

  for (const config of configs) {
    if (date && config.daysOfWeek) {
      const dayOfWeek = weekday(date);

      if (
        config.daysOfWeek.some((d) => WEEK_DAYS_NUMBER_MAP[d] === dayOfWeek)
      ) {
        onMatch(config);
      }
    } else {
      onMatch(config);
    }
  }
};

/**
 * Checks if a specific date is a business day.
 *
 * @param date The date to check
 * @param businessHours The business hours configuration (single or array)
 * @returns true if the date is a business day, false otherwise
 */
export const isBusinessDay = (
  date: Temporal.ZonedDateTime,
  businessHours?: BusinessHours | BusinessHours[]
): boolean => {
  if (!businessHours) {
    return true;
  }

  let hasMatch = false;
  processBusinessHours(businessHours, {
    date,
    onMatch: () => {
      hasMatch = true;
    },
  });

  return hasMatch;
};

/**
 * Checks if a specific hour on a specific date is within business hours.
 *
 * @param options The options for checking business hours
 * @returns true if the time is within business hours, false otherwise
 */
export const isBusinessHour = ({
  date,
  hour,
  minute = 0,
  durationMinutes,
  businessHours,
}: IsBusinessHourOptions): boolean => {
  // If business hours are not configured, consider everything as "business hours"
  if (!businessHours) {
    return true;
  }

  // If hour is not provided, we assume the user only cares about the day
  if (hour === undefined) {
    return isBusinessDay(date, businessHours);
  }

  let isInBusinessHour = false;
  const currentMinutes = hour * 60 + minute;

  processBusinessHours(businessHours, {
    date,
    onMatch: (config) => {
      const window = unwrapWindow(config);

      if (window && isWithinWindow(currentMinutes, durationMinutes, window)) {
        isInBusinessHour = true;
      }
    },
  });

  return isInBusinessHour;
};

interface BusinessHoursRange {
  hasBusinessHours: boolean;
  /** Latest end across configs, in hours (fractional for sub-hour boundaries). */
  maxEnd: number;
  /** Earliest start across configs, in hours (fractional for sub-hour boundaries). */
  minStart: number;
}

/**
 * Calculates the union of business hours ranges across multiple dates and/or resource configurations.
 */
export const calculateBusinessHoursRange = (options: {
  allDates: Temporal.ZonedDateTime[];
  businessHours?: BusinessHours | BusinessHours[];
  resourceBusinessHours?: (BusinessHours | BusinessHours[])[];
  hideNonBusinessHours?: boolean;
}): BusinessHoursRange => {
  const {
    allDates,
    businessHours,
    resourceBusinessHours = [],
    hideNonBusinessHours,
  } = options;

  let minStart = 24;
  let maxEnd = 0;
  let hasBusinessHours = false;

  const onMatch = (config: BusinessHours) => {
    // A matched config counts as configured even when closed (start === end):
    // an all-closed calendar must produce an empty range, not the 9-17
    // fallback below. Closed entries contribute no range to the union.
    hasBusinessHours = true;
    const window = unwrapWindow(config);

    if (!window) {
      return;
    }

    minStart = Math.min(minStart, window.start / 60);
    maxEnd = Math.max(maxEnd, window.end / 60);
  };

  // Invoke processBusinessHours for the global config and every resource
  // config, optionally scoped to a specific date.
  const processAll = (date?: Temporal.ZonedDateTime) => {
    processBusinessHours(businessHours, { date, onMatch });

    for (const rbh of resourceBusinessHours) {
      processBusinessHours(rbh, { date, onMatch });
    }
  };

  for (const date of allDates) {
    processAll(date);
  }

  // Fallback: retry without date scoping when the date-scoped pass matched
  // nothing (e.g. the reference date has no config but other days do).
  if (!hasBusinessHours && hideNonBusinessHours === true) {
    processAll();
  }

  return { hasBusinessHours, maxEnd, minStart };
};
