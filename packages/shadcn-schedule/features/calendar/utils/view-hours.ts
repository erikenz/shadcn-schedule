import type { Temporal } from "temporal-polyfill";

import { calculateBusinessHoursRange } from "@/features/calendar/utils/business-hours";
import { getDayHours } from "@/lib/utils/date-utils";
import type { BusinessHours, Resource } from "@/types/index";

/**
 * The ONE derivation of per-resource business hours for `getViewHours`'s
 * `resourceBusinessHours` parameter. Empty input → empty output, which
 * `getViewHours` treats as "no resource config" (regular-calendar behavior).
 */
export const collectResourceBusinessHours = (
  resources: Resource[]
): (BusinessHours | BusinessHours[])[] =>
  resources.flatMap((r) => (r.businessHours ? [r.businessHours] : []));

interface GetViewHoursOptions {
  /**
   * For views with multiple days (like WeekView), we might want to show
   * the union of all business hours across those days.
   */
  allDates?: Temporal.ZonedDateTime[];
  businessHours?: BusinessHours | BusinessHours[];
  hideNonBusinessHours?: boolean;
  referenceDate: Temporal.ZonedDateTime;
  /**
   * Optional additional business hours configurations (e.g., from resources).
   * These will be merged with the global businessHours when calculating the visible range.
   */
  resourceBusinessHours?: (BusinessHours | BusinessHours[])[];
}

/**
 * Generates the list of hours to display in the calendar view.
 * If hideNonBusinessHours is true, it filters the hours based on businessHours configuration.
 * For multiple dates, it takes the earliest start and latest end across all dates.
 */
export const getViewHours = ({
  referenceDate,
  businessHours,
  hideNonBusinessHours,
  allDates = [referenceDate],
  resourceBusinessHours = [],
}: GetViewHoursOptions): Temporal.ZonedDateTime[] => {
  const hours = getDayHours({ referenceDate });

  const hasBusinessHoursConfig =
    Boolean(businessHours) || resourceBusinessHours.length > 0;

  const shouldFilterByBusinessHours =
    hideNonBusinessHours === true && hasBusinessHoursConfig;

  if (!shouldFilterByBusinessHours) {
    return hours;
  }

  const { minStart, maxEnd, hasBusinessHours } = calculateBusinessHoursRange({
    allDates,
    businessHours,
    hideNonBusinessHours,
    resourceBusinessHours,
  });

  if (!hasBusinessHours) {
    return hours;
  }

  if (minStart >= maxEnd) {
    return [];
  }

  // Floor/ceil so hours hosting a sub-hour boundary (e.g. a 9:15 start)
  // stay visible rather than being cut off at the fractional bound.
  const firstVisibleHour = Math.floor(minStart);
  const lastVisibleHourExclusive = Math.ceil(maxEnd);

  // An overnight window (e.g. 13:00 → 01:00) renders its hours wrapped:
  // 13..23 first, then 0..1, so cross-midnight events flow continuously.
  // The tail hours belong to the NEXT day: the layout compares event bounds
  // and grid bounds in absolute time, so same-day tail hours would sit before
  // the evening columns and drop every event that crosses midnight.
  if (lastVisibleHourExclusive > 24) {
    const tailEnd = lastVisibleHourExclusive - 24;

    const tailHours = getDayHours({
      referenceDate: referenceDate.add({ days: 1 }),
    });

    return [
      ...hours.filter(({ hour }) => hour >= firstVisibleHour),
      ...tailHours.filter(({ hour }) => hour < tailEnd),
    ];
  }

  return hours.filter(
    ({ hour }) => hour >= firstVisibleHour && hour < lastVisibleHourExclusive
  );
};
