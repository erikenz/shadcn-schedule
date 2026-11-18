import type React from "react";
import type { Temporal } from "temporal-polyfill";

import { AnimatedSection } from "@/components/animations/animated-section";
import { DayLabel } from "@/components/ui/day-label";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { HEADER_ROW_HEIGHT } from "@/lib/constants";
import { isToday } from "@/lib/utils/date-utils";
import { keys } from "@/lib/utils/keys";
import { format } from "@/utils/temporal";

interface ResourceWeekHorizontalDayHeaderProps {
  days: Temporal.ZonedDateTime[];
}

export const ResourceWeekHorizontalDayHeader: React.FC<
  ResourceWeekHorizontalDayHeaderProps
> = ({ days }) => {
  const { weekViewGranularity } = useSmartCalendarContext();
  const isHourly = weekViewGranularity === "hourly";

  return (
    <div className={cn("bg-border flex gap-px border-b", HEADER_ROW_HEIGHT)}>
      {days.map((day, _index) => {
        const today = isToday(day);
        const key = keys.header.week.day(day);

        return (
          <div
            className={cn(
              "bg-background flex min-w-20 flex-1 shrink-0 items-center text-center font-medium"
            )}
            data-testid={keys.header.resource.weekDay}
            key={key}
          >
            <AnimatedSection
              className={cn(
                isHourly ? "sticky left-1/2" : "w-full text-center"
              )}
              transitionKey={key}
            >
              <DayLabel
                dayNumber={format(day, "D")}
                today={today}
                weekday={format(day, "ddd")}
              />
            </AnimatedSection>
          </div>
        );
      })}
    </div>
  );
};
