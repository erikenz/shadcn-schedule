import type { Temporal } from "temporal-polyfill";

import { AnimatedSection } from "@/components/animations/animated-section";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { getDayKey, getWeekDays, isToday } from "@/lib/utils/date-utils";
import { keys } from "@/lib/utils/keys";
import {
  endOf,
  format,
  isSame,
  monthIndex,
  now,
  startOf,
  weekday,
} from "@/utils/temporal";

const EVENT_DOT_COLORS = ["bg-primary", "bg-blue-500", "bg-green-500"];
const DAYS_IN_MINI_CALENDAR = 42;

interface MonthData {
  date: Temporal.ZonedDateTime;
  eventCount: number;
  monthKey: string;
  name: string;
}

interface DayData {
  date: Temporal.ZonedDateTime;
  dayKey: string;
  eventCount: number;
  isInCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
}

const getDayClassName = (day: DayData): string => {
  const baseClass =
    "relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center hover:bg-accent rounded-sm transition-colors duration-200";

  const outsideMonthClass = day.isInCurrentMonth
    ? ""
    : "text-muted-foreground opacity-50";

  const todayClass = day.isToday
    ? "bg-primary text-primary-foreground rounded-full"
    : "";

  const selectedClass =
    day.isSelected && !day.isToday ? "bg-muted rounded-full font-bold" : "";

  const hasEventsClass =
    day.eventCount > 0 && !day.isToday && !day.isSelected ? "font-medium" : "";

  return cn(
    baseClass,
    outsideMonthClass,
    todayClass,
    selectedClass,
    hasEventsClass
  );
};

const getEventDotClassName = (color: string, isTodayDate: boolean): string => {
  const dotColor = isTodayDate ? "bg-primary-foreground" : color;

  return cn("h-[3px] w-[3px] rounded-full", dotColor);
};

export const YearView = () => {
  const { currentDate, setView, getEventsForDateRange, t, firstDayOfWeek } =
    useSmartCalendarContext();

  const currentYear = currentDate.year;

  const weekdayHeaders = getWeekDays(now(), firstDayOfWeek).map((d) => ({
    id: String(weekday(d)),
    label: format(d, "dd"),
  }));

  const generateMonthsData = (): MonthData[] =>
    Array.from({ length: 12 }, (_, monthOffset) => {
      const monthDate = startOf(
        now().with({ month: monthOffset + 1, year: currentYear }),
        "month"
      );

      const eventsInMonth = getEventsForDateRange(
        monthDate,
        endOf(monthDate, "month")
      );

      return {
        date: monthDate,
        eventCount: eventsInMonth.length,
        monthKey: format(monthDate, "MM"),
        name: format(monthDate, "MMMM"),
      };
    });

  const generateDaysForMonth = (
    monthDate: Temporal.ZonedDateTime
  ): DayData[] => {
    const monthStart = startOf(monthDate, "month");

    const firstDayOfCalendar =
      getWeekDays(monthStart, firstDayOfWeek).at(0) ?? monthStart;

    return Array.from({ length: DAYS_IN_MINI_CALENDAR }, (_, dayIndex) => {
      const dayDate = firstDayOfCalendar.add({ days: dayIndex });
      const dayStart = startOf(dayDate, "day");
      const dayEnd = endOf(dayDate, "day");
      const eventsOnDay = getEventsForDateRange(dayStart, dayEnd);

      return {
        date: dayDate,
        dayKey: getDayKey(dayDate),
        eventCount: eventsOnDay.length,
        isInCurrentMonth: monthIndex(dayDate) === monthIndex(monthDate),
        isSelected: isSame(dayDate, currentDate, "day"),
        isToday: isToday(dayDate),
      };
    });
  };

  const navigateToDate = (
    date: Temporal.ZonedDateTime,
    view: "month" | "day",
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();
    // Atomic date + view change: one onDateChange with the clicked day's
    // range in the target view (issue #231).
    setView(view, date);
  };

  const getEventCountLabel = (count: number): string => {
    const eventWord = count === 1 ? t("event") : t("events");

    return `${count} ${eventWord}`;
  };

  const monthsData = generateMonthsData();

  // The day number is the cell's visible label; the event count is added to the
  // accessible name because a `title` tooltip is not reachable by keyboard or
  // screen reader.
  const getDayLabel = (day: DayData): string => {
    const count = getEventCountLabel(day.eventCount);

    return day.eventCount === 0
      ? `${day.date.day}`
      : `${day.date.day} · ${count}`;
  };

  return (
    <ScrollArea className="h-full" data-testid="year-view">
      <div
        className="grid auto-rows-fr grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="year-grid"
      >
        {monthsData.map((month) => {
          const daysInMonth = generateDaysForMonth(month.date);

          const handleMonthClick = () => {
            navigateToDate(month.date, "month");
          };

          return (
            <div
              className="hover:border-primary flex flex-col rounded-lg border p-3 text-left transition duration-200 hover:shadow-md"
              data-testid={keys.header.year.month(month.monthKey)}
              key={month.monthKey}
            >
              <AnimatedSection
                className="mb-2 flex items-center justify-between"
                key={keys.listKey("month", month.monthKey)}
                transitionKey={keys.listKey("month", month.monthKey)}
              >
                <button
                  className="cursor-pointer text-lg font-medium hover:underline"
                  data-testid={keys.header.year.month(month.monthKey, "title")}
                  onClick={handleMonthClick}
                  type="button"
                >
                  {month.name}
                </button>

                {month.eventCount > 0 && (
                  <span
                    className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs"
                    data-testid={keys.header.year.month(
                      month.monthKey,
                      "count"
                    )}
                  >
                    {getEventCountLabel(month.eventCount)}
                  </span>
                )}
              </AnimatedSection>

              <div
                className="grid grid-cols-7 gap-px text-xs"
                data-testid={keys.header.year.month(month.monthKey, "mini")}
              >
                {weekdayHeaders.map((day) => (
                  <div
                    className="text-muted-foreground h-3 text-center"
                    key={keys.listKey("header", month.monthKey, day.id)}
                  >
                    {day.label}
                  </div>
                ))}

                {daysInMonth.map((day) => {
                  const dayTestId = keys.header.year.day(
                    format(month.date, "YYYY-MM"),
                    day.dayKey
                  );

                  const hasEvents = day.eventCount > 0;
                  const visibleDotCount = Math.min(day.eventCount, 3);

                  const visibleDotColors = EVENT_DOT_COLORS.slice(
                    0,
                    visibleDotCount
                  );

                  const handleDayClick = (e: React.MouseEvent) => {
                    navigateToDate(day.date, "day", e);
                  };

                  return (
                    <button
                      className={getDayClassName(day)}
                      data-testid={dayTestId}
                      key={day.dayKey}
                      onClick={handleDayClick}
                      aria-label={getDayLabel(day)}
                      type="button"
                    >
                      <span className="text-center leading-none">
                        {day.date.day}
                      </span>

                      {hasEvents && (
                        <div
                          className={cn(
                            "absolute bottom-0 flex w-full justify-center space-x-px",
                            day.isToday && "bottom-px"
                          )}
                        >
                          {visibleDotColors.map((dotColor) => (
                            <span
                              className={getEventDotClassName(
                                dotColor,
                                day.isToday
                              )}
                              key={dotColor}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar className="z-30" />
    </ScrollArea>
  );
};
