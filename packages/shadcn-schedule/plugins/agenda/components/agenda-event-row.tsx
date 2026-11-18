import type { Temporal } from "temporal-polyfill";

import { useCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { hasText, textOr } from "@/lib/guards";
import type { CalendarEvent, TimeFormat } from "@/types/index";
import { diff, format, startOf } from "@/utils/temporal";

interface AgendaEventRowProps {
  /** The day this row appears under (an all-day event renders one row per day). */
  day: Temporal.ZonedDateTime;
  event: CalendarEvent;
}

const getTimePattern = (timeFormat: TimeFormat): string =>
  timeFormat === "24-hour" ? "HH:mm" : "h:mm A";

export const AgendaEventRow = ({ event, day }: AgendaEventRowProps) => {
  const { t, timeFormat, onEventClick } = useCalendarContext();

  const startTime = format(event.start, getTimePattern(timeFormat));
  const timeLabel = event.allDay === true ? t("allDay") : startTime;

  const eventStartDay = startOf(event.start, "day");
  const totalDays = diff(startOf(event.end, "day"), eventStartDay, "day") + 1;
  const dayIndex = diff(startOf(day, "day"), eventStartDay, "day") + 1;
  const isMultiDayAllDay = Boolean(event.allDay) && totalDays > 1;
  const dayLabel = `(${t("day")} ${dayIndex}/${totalDays})`;
  const dayCounter = isMultiDayAllDay ? dayLabel : null;

  const handleClick = (nativeEvent: React.MouseEvent) => {
    onEventClick(event, nativeEvent);
  };

  return (
    <button
      className="hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-sm"
      onClick={handleClick}
      type="button"
    >
      <span className="text-muted-foreground w-20 shrink-0">{timeLabel}</span>
      <span
        className={cn(
          "size-3 shrink-0 rounded-full border",
          textOr(event.backgroundColor, "bg-blue-500"),
          event.color
        )}
        // The CSS prop takes undefined for "no color", not null.
        style={{ backgroundColor: event.backgroundColor ?? undefined }}
      />
      <span className="truncate">{event.title}</span>
      {hasText(dayCounter) ? (
        <span className="text-muted-foreground shrink-0 text-xs">
          {dayCounter}
        </span>
      ) : null}
    </button>
  );
};
