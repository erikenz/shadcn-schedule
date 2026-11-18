import type { Temporal } from "temporal-polyfill";

import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { format } from "@/utils/temporal";

interface HourLabelProps {
  date: Temporal.ZonedDateTime;
}

export const HourLabel: React.FC<HourLabelProps> = ({ date }) => {
  const { renderHour, timeFormat } = useSmartCalendarContext();

  if (renderHour) {
    return <>{renderHour(date)}</>;
  }

  return <>{format(date, timeFormat === "12-hour" ? "h A" : "H")}</>;
};
