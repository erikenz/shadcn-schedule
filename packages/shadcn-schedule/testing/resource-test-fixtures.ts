import type { BusinessHours, CalendarEvent, Resource } from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

/**
 * Shared fixtures for the resource/business-hours test suites. Test files
 * import construction from here; each suite keeps its own assertions.
 */

/** Monday-to-Friday business hours over the given hour range. */
export const weekdayBusinessHours = (
  startTime: number,
  endTime: number
): BusinessHours => ({
  daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  endTime,
  startTime,
});

/** A single plain resource. */
export const singleResource: Resource[] = [{ id: "1", title: "Resource 1" }];

/** Two plain resources, as rendered by the resource week-view suites. */
export const twoResources: Resource[] = [
  { id: "1", title: "Resource 1" },
  { id: "2", title: "Resource 2" },
];

/** Empty event list shared by the resource week-view render helpers. */
export const noEvents: CalendarEvent[] = [];

/** Wednesday, Jan 1 2025 — the anchor date of the resource week-view suites. */
export const resourceWeekInitialDate = toZonedDateTime(
  "2025-01-01T00:00:00.000Z"
);

// ---------------------------------------------------------------------------
// Shared assertion helpers — dedupe the business-hours test clone groups.
// ---------------------------------------------------------------------------

const paddedHour = (n: number): string => String(n).padStart(2, "0");

/**
 * Core of the business-hour range assertions: the first/last visible hours
 * must satisfy the visible expectation, the first/last hidden hours the
 * hidden one. The view-specific helpers below supply the expectations.
 *
 * Assertions run as thrown errors (not vitest `expect`) because this module
 * is a shared fixture: `expect` is only meaningful inside a test function,
 * and these helpers are invoked from many suites.
 */
const assertHourRange = (
  isVisible: (hour: string) => boolean,
  isHidden: (hour: string) => boolean,
  firstVisible: number,
  lastVisible: number,
  firstHidden: number,
  lastHidden: number
): void => {
  for (const hour of [paddedHour(firstVisible), paddedHour(lastVisible)]) {
    if (!isVisible(hour)) {
      throw new Error(`Expected business hour ${hour} to be visible`);
    }
  }

  for (const hour of [paddedHour(firstHidden), paddedHour(lastHidden)]) {
    if (!isHidden(hour)) {
      throw new Error(`Expected hour ${hour} to be hidden`);
    }
  }
};

/**
 * Assert that a vertical day-view shows only the given business hour range.
 * Used by both the regular and resource "weekend fallback" business-hours tests.
 */
export const assertVerticalBusinessHourRange = (
  screen: {
    queryByTestId: (id: string) => HTMLElement | null;
  },
  firstVisible: number,
  lastVisible: number,
  firstHidden: number,
  lastHidden: number
): void => {
  assertHourRange(
    (hour) => screen.queryByTestId(`vertical-time-${hour}`) !== null,
    (hour) => screen.queryByTestId(`vertical-time-${hour}`) === null,
    firstVisible,
    lastVisible,
    firstHidden,
    lastHidden
  );
};

/**
 * Assert that a resource-week horizontal view shows only the given business
 * hour range. Used by the resource-business-hours and resource-week-horizontal
 * test suites.
 */
export const assertResourceWeekBusinessHourRange = (
  screen: {
    getAllByTestId: (id: string) => HTMLElement[];
    queryAllByTestId: (id: string) => HTMLElement[];
  },
  firstVisible: number,
  lastVisible: number,
  firstHidden: number,
  lastHidden: number
): void => {
  assertHourRange(
    (hour) =>
      screen.getAllByTestId(`resource-week-time-label-${hour}`).length > 0,
    (hour) =>
      screen.queryAllByTestId(`resource-week-time-label-${hour}`).length === 0,
    firstVisible,
    lastVisible,
    firstHidden,
    lastHidden
  );
};
