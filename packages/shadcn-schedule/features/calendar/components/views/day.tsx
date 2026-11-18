import { Square } from "lucide-react";
import type React from "react";
import type { Temporal } from "temporal-polyfill";

import { AnimatedSection } from "@/components/animations/animated-section";
import {
  FULL_WIDTH_MINUS_GUTTER,
  gutterColumn,
} from "@/components/vertical-grid/gutter";
import {
  RESOURCE_CELL_WIDTH,
  ResourceColumnsHeader,
  ResourcesCornerCell,
  resourceHorizontalRows,
  resourceVerticalColumns,
} from "@/features/calendar/components/views/resource-axis";
import { TimeHeaderRow } from "@/features/calendar/components/views/time-header-row";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import {
  collectResourceBusinessHours,
  getViewHours,
} from "@/features/calendar/utils/view-hours";
import { cn } from "@/lib/cn";
import { getDayKey, isToday } from "@/lib/utils/date-utils";
import { keys } from "@/lib/utils/keys";
import type {
  HorizontalRowSpec,
  PluginView,
  VerticalColumnSpec,
  ViewConfig,
} from "@/types/index";
import { endOf, format, startOf } from "@/utils/temporal";

const DayViewHeader: React.FC<{ date: Temporal.ZonedDateTime }> = ({
  date,
}) => {
  const { t } = useSmartCalendarContext((c) => ({ t: c.t }));
  const today = isToday(date);

  return (
    <div
      className="flex min-h-12 flex-1 items-center justify-center"
      data-testid="day-view-header"
    >
      <AnimatedSection
        className={cn(
          "flex items-center justify-center text-center text-sm font-semibold sm:text-xl",
          today && "text-primary"
        )}
        transitionKey={getDayKey(date)}
      >
        {format(date, "dddd, LL")}
        {today && (
          <span className="bg-primary text-primary-foreground ml-2 rounded-full px-1 py-0.5 text-xs sm:px-2 sm:text-sm">
            {t("today")}
          </span>
        )}
      </AnimatedSection>
    </div>
  );
};

const dayHours = (date: Temporal.ZonedDateTime, config: ViewConfig) =>
  getViewHours({
    allDates: [date],
    businessHours: config.businessHours,
    hideNonBusinessHours: config.hideNonBusinessHours,
    referenceDate: date,
    resourceBusinessHours: collectResourceBusinessHours(config.resources ?? []),
  });

const ResourceDayHorizontalHeader: React.FC<{
  date: Temporal.ZonedDateTime;
  config: ViewConfig;
}> = ({ date, config }) => {
  const hours = dayHours(date, config);

  return (
    <>
      <ResourcesCornerCell />
      <div className="flex flex-1 flex-col">
        <TimeHeaderRow hours={hours} view="day" />
      </div>
    </>
  );
};

const dayColumns = (
  date: Temporal.ZonedDateTime,
  config: ViewConfig
): VerticalColumnSpec[] | HorizontalRowSpec[] => {
  const resources = config.resources ?? [];
  const hours = dayHours(date, config);

  if (!resources.length) {
    return [
      gutterColumn({ days: hours, gridType: "hour" }),
      {
        className: cn(FULL_WIDTH_MINUS_GUTTER, "flex-1"),
        day: date,
        days: hours,
        gridType: "hour",
        id: keys.col.day(date),
      },
    ];
  }

  if (config.orientation === "vertical") {
    return resourceVerticalColumns({
      columnsFor: (resource) => ({
        day: date,
        days: hours,
        gridType: "hour" as const,
        id: keys.col.day(date, resource.id),
      }),
      gutter: gutterColumn({ days: hours, gridType: "hour" }),
      resources,
    });
  }

  return resourceHorizontalRows({
    cellClassName: RESOURCE_CELL_WIDTH,
    days: hours,
    gridType: "hour",
    resources,
  });
};

export const dayView: PluginView = {
  columns: dayColumns,
  icon: Square,
  label: "day",
  layout: "vertical",
  name: "day",
  navigationUnit: "day",
  range: (date) => ({ end: endOf(date, "day"), start: startOf(date, "day") }),
  renderHeader: ({ date, config }) => {
    const resources = config.resources ?? [];

    if (!resources.length) {
      return <DayViewHeader date={date} />;
    }

    if (config.orientation === "vertical") {
      return <ResourceColumnsHeader resources={resources} />;
    }

    return <ResourceDayHorizontalHeader config={config} date={date} />;
  },
  supportsResources: true,
};
