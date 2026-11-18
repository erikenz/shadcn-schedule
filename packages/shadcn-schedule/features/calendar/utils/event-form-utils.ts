import type { Temporal } from "temporal-polyfill";

import { calculateBusinessHoursRange } from "@/features/calendar/utils/business-hours";
import type { BusinessHours } from "@/types/index";
import { toZonedDateTime } from "@/utils/temporal";

export const buildDateTime = (
  date: Date,
  time: string,
  isAllDay: boolean
): Temporal.ZonedDateTime => {
  const [hours, minutes] = time.split(":").map(Number);
  const base = toZonedDateTime(date).with({ hour: hours, minute: minutes });

  return isAllDay ? base.with({ hour: 0, minute: 0 }) : base;
};

export const buildEndDateTime = (
  date: Date,
  time: string,
  isAllDay: boolean
): Temporal.ZonedDateTime => {
  const [hours, minutes] = time.split(":").map(Number);
  const base = toZonedDateTime(date).with({ hour: hours, minute: minutes });

  return isAllDay ? base.with({ hour: 23, minute: 59 }) : base;
};

export const getTimeConstraints = (
  date: Date,
  businessHours?: BusinessHours | BusinessHours[]
) => {
  if (!businessHours) {
    return { max: "23:59", min: "00:00" };
  }

  const zonedDate = toZonedDateTime(date);

  const { minStart, maxEnd, hasBusinessHours } = calculateBusinessHoursRange({
    businessHours,
    allDates: [zonedDate],
    hideNonBusinessHours: false,
  });

  if (!hasBusinessHours) {
    return { max: "23:59", min: "00:00" };
  }

  return {
    max: `${(maxEnd - 1).toString().padStart(2, "0")}:45`,
    min: `${minStart.toString().padStart(2, "0")}:00`,
  };
};
