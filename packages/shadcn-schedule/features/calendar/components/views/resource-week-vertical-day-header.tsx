import type React from "react";
import type { Temporal } from "temporal-polyfill";

import { AnimatedSection } from "@/components/animations/animated-section";
import { DayLabel } from "@/components/ui/day-label";
import {
  GUTTER_WIDTH,
  STICKY_GUTTER_SHADOW,
} from "@/components/vertical-grid/gutter";
import { RESOURCE_CELL_WIDTH } from "@/features/calendar/components/views/resource-axis";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { isToday } from "@/lib/utils/date-utils";
import { keys } from "@/lib/utils/keys";
import type { Resource } from "@/types/index";
import { format } from "@/utils/temporal";

interface ResourceWeekVerticalDayHeaderProps {
  days: Temporal.ZonedDateTime[];
  resources: Resource[];
}

/**
 * Top header row of the hourly resource week view. One group per visible day,
 * each group spanning the day's resource columns with the same flex structure
 * as the grid body (day outer, resources inner), so header and body columns
 * align exactly. The day label is centered over the group.
 */
export const ResourceWeekVerticalDayHeader: React.FC<
  ResourceWeekVerticalDayHeaderProps
> = ({ days, resources }) => {
  const { currentDate } = useSmartCalendarContext();

  return (
    <div
      className="bg-border flex h-12 gap-px"
      data-testid={keys.header.resource.weekDay}
    >
      <div
        className={cn(
          "bg-background sticky left-0 z-20 shrink-0",
          GUTTER_WIDTH,
          STICKY_GUTTER_SHADOW
        )}
      >
        <span className="flex h-full w-full items-center justify-center px-2 font-medium">
          {currentDate.weekOfYear}
        </span>
      </div>
      {days.map((day) => {
        const today = isToday(day);
        const key = keys.header.week.day(day);

        return (
          <div
            className="relative flex shrink-0"
            key={key}
            style={{ flex: resources.length }}
          >
            {/* One spacer per resource column, mirroring the body's flex. */}
            {resources.map((_, index) => (
              <div
                className={cn(RESOURCE_CELL_WIDTH, "bg-background")}
                key={keys.listKey("day-header-spacer", index)}
              />
            ))}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <AnimatedSection transitionKey={key}>
                <DayLabel
                  dayNumber={format(day, "D")}
                  today={today}
                  weekday={format(day, "ddd")}
                />
              </AnimatedSection>
            </div>
          </div>
        );
      })}
    </div>
  );
};
