import { Grid3x3 } from "lucide-react";
import type React from "react";
import type { Temporal } from "temporal-polyfill";

import { AnimatedSection } from "@/components/animations/animated-section";
import { DayLabel } from "@/components/ui/day-label";
import { gutterColumn } from "@/components/vertical-grid/gutter";
import { MonthHeader } from "@/features/calendar/components/views/month-header";
import {
  ResourceColumnsHeader,
  ResourcesCornerCell,
  resourceHorizontalRows,
  resourceVerticalColumns,
} from "@/features/calendar/components/views/resource-axis";
import {
  getMonthDays,
  getMonthGridRange,
  getMonthWeeks,
  isToday,
} from "@/lib/utils/date-utils";
import { keys } from "@/lib/utils/keys";
import type {
  HorizontalRowSpec,
  PluginView,
  Resource,
  VerticalColumnSpec,
  ViewConfig,
} from "@/types/index";
import { format } from "@/utils/temporal";

const resourceMonthVerticalColumns = (
  date: Temporal.ZonedDateTime,
  resources: Resource[]
): VerticalColumnSpec[] => {
  const daysInMonth = getMonthDays(date);

  return resourceVerticalColumns({
    columnsFor: (resource) => ({
      days: daysInMonth,
      gridType: "day" as const,
      id: keys.col.resource("month", resource.id),
    }),
    gutter: gutterColumn({
      days: daysInMonth,
      gridType: "day",
      renderLabel: (day: Temporal.ZonedDateTime) => (
        <DayLabel
          className="flex-col-reverse"
          dayNumber={format(day, "D")}
          today={isToday(day)}
          weekday={format(day, "ddd")}
        />
      ),
    }),
    resources,
  });
};

const ResourceMonthHorizontalHeader: React.FC<{
  date: Temporal.ZonedDateTime;
}> = ({ date }) => {
  const monthDays = getMonthDays(date);

  return (
    <>
      <ResourcesCornerCell />
      <div className="bg-border flex flex-1 gap-px border-b">
        {monthDays.map((day, _index) => {
          const key = keys.header.resource.monthDay(day);
          const today = isToday(day);

          return (
            <div
              className="bg-background flex w-20 flex-1 shrink-0 flex-col items-center justify-center"
              key={key}
            >
              <AnimatedSection transitionKey={key}>
                <DayLabel
                  className="flex-col-reverse"
                  dayNumber={format(day, "D")}
                  today={today}
                  weekday={format(day, "ddd")}
                />
              </AnimatedSection>
            </div>
          );
        })}
      </div>
    </>
  );
};

const monthRows = (
  date: Temporal.ZonedDateTime,
  config: ViewConfig
): VerticalColumnSpec[] | HorizontalRowSpec[] => {
  const resources = config.resources ?? [];

  if (resources.length) {
    if (config.orientation === "vertical") {
      return resourceMonthVerticalColumns(date, resources);
    }

    return resourceHorizontalRows({
      days: getMonthDays(date),
      gridType: "day",
      resources,
    });
  }

  return getMonthWeeks(date, config.firstDayOfWeek).map((days, weekIndex) => ({
    className: "flex-1",
    columns: days.map((day) => ({
      day,
      className: "w-auto",
      gridType: "day" as const,
      id: keys.col.day(day),
    })),
    id: keys.listKey("week", weekIndex),
    showDayNumber: true,
  }));
};

export const monthView: PluginView = {
  columns: monthRows,
  icon: Grid3x3,
  label: "month",
  layout: "horizontal",
  name: "month",
  navigationUnit: "month",
  range: (date, config) => getMonthGridRange(date, config.firstDayOfWeek),
  renderHeader: ({ date, config }) => {
    const resources = config.resources ?? [];

    if (!resources.length) {
      return <MonthHeader className="h-12" />;
    }

    if (config.orientation === "vertical") {
      return <ResourceColumnsHeader resources={resources} />;
    }

    return <ResourceMonthHorizontalHeader date={date} />;
  },
  supportsResources: true,
};
