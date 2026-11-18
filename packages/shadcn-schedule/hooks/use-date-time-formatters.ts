import { useMemo } from "react";
import type { Temporal } from "temporal-polyfill";

import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { toDate } from "@/utils/temporal";

export const useDateTimeFormatters = () => {
  const { currentLocale, timezone } = useSmartCalendarContext((ctx) => ({
    currentLocale: ctx.currentLocale,
    timezone: ctx.timezone,
  }));

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(currentLocale, {
        day: "numeric",
        month: "short",
        timeZone: timezone,
      }),
    [currentLocale, timezone]
  );

  const formatDateRange = (
    start: Temporal.ZonedDateTime,
    end: Temporal.ZonedDateTime
  ) => {
    // `formatRange` shows whichever fields distinguish the two dates, so a
    // week spanning two years renders the year on BOTH ends ("Dec 30, 2026 –
    // Jan 5, 2027"), which wraps the header. A cross-year week always spans two
    // different months, so dropping the year stays unambiguous ("Dec 30 – Jan
    // 5"). Same-year ranges keep `formatRange`'s concise collapsing.
    if (start.year === end.year) {
      return formatter.formatRange(toDate(start), toDate(end));
    }

    return `${formatter.format(toDate(start))} – ${formatter.format(toDate(end))}`;
  };

  return { formatDateRange };
};
