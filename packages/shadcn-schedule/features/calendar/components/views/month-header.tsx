import type React from "react";

import { AnimatedSection } from "@/components/animations/animated-section";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { getWeekDays } from "@/lib/utils/date-utils";
import { keys } from "@/lib/utils/keys";
import { format, toISOString } from "@/utils/temporal";

interface MonthHeaderProps {
  className?: string;
}

export const MonthHeader: React.FC<MonthHeaderProps> = ({ className }) => {
  const { firstDayOfWeek, stickyViewHeader, viewHeaderClassName, currentDate } =
    useSmartCalendarContext();

  // Reorder week days based on firstDayOfWeek
  const weekDays = getWeekDays(currentDate, firstDayOfWeek);

  return (
    <div
      className={cn(
        // gap-px + bg-border: weekday separators; border-b: header/body line.
        "bg-border flex w-full gap-px border-b",
        stickyViewHeader && "sticky top-0 z-20",
        viewHeaderClassName,
        className
      )}
      data-testid="month-header"
    >
      {weekDays.map((weekDay) => (
        <div
          className="bg-background flex min-w-0 flex-1 items-center justify-center py-2 text-center font-medium"
          data-testid={keys.header.weekday("month", format(weekDay, "ddd"))}
          key={toISOString(weekDay)}
        >
          <AnimatedSection transitionKey={toISOString(weekDay)}>
            <span className="block w-full truncate text-sm capitalize">
              {format(weekDay, "ddd")}
            </span>
          </AnimatedSection>
        </div>
      ))}
    </div>
  );
};
