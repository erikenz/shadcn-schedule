import type React from "react";
import type { Temporal } from "temporal-polyfill";

import { ResourceCell } from "@/components/resource-cell";
import {
  GUTTER_WIDTH,
  STICKY_GUTTER_SHADOW,
} from "@/components/vertical-grid/gutter";
import { RESOURCE_CELL_WIDTH } from "@/features/calendar/components/views/resource-axis";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { keys } from "@/lib/utils/keys";
import type { Resource } from "@/types/index";
import { toISOString } from "@/utils/temporal";

interface ResourceWeekVerticalResourceHeaderProps {
  /**
   * Hourly mode: resources repeat once per day, matching the day-major column
   * order of `resourceWeekVerticalColumns`. Daily mode: rendered once.
   */
  days?: Temporal.ZonedDateTime[];
  resources: Resource[];
}

export const ResourceWeekVerticalResourceHeader: React.FC<
  ResourceWeekVerticalResourceHeaderProps
> = ({ days, resources }) => {
  const { weekViewGranularity, t, currentDate } = useSmartCalendarContext();
  const isHourly = weekViewGranularity === "hourly";
  const dayList = isHourly && days ? days : [undefined];

  return (
    <div className="bg-border flex h-12 gap-px">
      <div
        className={cn(
          "bg-background sticky left-0 z-20 shrink-0",
          GUTTER_WIDTH,
          STICKY_GUTTER_SHADOW
        )}
      >
        <span
          className={cn(
            "text-muted-foreground flex h-full w-full min-w-0 flex-col justify-center px-2 text-center text-xs",
            isHourly ? "justify-end" : "justify-center"
          )}
        >
          <span className="w-full truncate">{t("week")}</span>
          {!isHourly && (
            <span className="text-foreground w-full truncate font-medium">
              {currentDate.weekOfYear}
            </span>
          )}
        </span>
      </div>

      {dayList.flatMap((day) =>
        resources.map((resource) => (
          <ResourceCell
            className={cn(RESOURCE_CELL_WIDTH, "bg-background border-b")}
            key={keys.listKey(
              "resource-cell",
              day ? toISOString(day) : "all",
              resource.id
            )}
            resource={resource}
          >
            <div
              className={cn(
                "sticky truncate text-sm font-medium",
                isHourly ? "left-1/4" : "left-1"
              )}
            >
              {resource.title}
            </div>
          </ResourceCell>
        ))
      )}
    </div>
  );
};
