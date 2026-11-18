import { Columns3 } from "lucide-react";
import type React from "react";
import type { Temporal } from "temporal-polyfill";

import { AnimatedSection } from "@/components/animations/animated-section";
import { DayLabel } from "@/components/ui/day-label";
import {
  gutterColumn,
  RESPONSIVE_GUTTER_WIDTH,
  STICKY_GUTTER_SHADOW,
} from "@/components/vertical-grid/gutter";
import {
  RESOURCE_CELL_WIDTH,
  ResourcesCornerCell,
  resourceHorizontalRows,
  resourceVerticalColumns,
} from "@/features/calendar/components/views/resource-axis";
import { ResourceWeekHorizontalDayHeader } from "@/features/calendar/components/views/resource-week-horizontal-day-header";
import { ResourceWeekVerticalDayHeader } from "@/features/calendar/components/views/resource-week-vertical-day-header";
import { ResourceWeekVerticalResourceHeader } from "@/features/calendar/components/views/resource-week-vertical-resource-header";
import { TimeHeaderRow } from "@/features/calendar/components/views/time-header-row";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import {
  collectResourceBusinessHours,
  getViewHours,
} from "@/features/calendar/utils/view-hours";
import { cn } from "@/lib/cn";
import { getWeekDays, isToday } from "@/lib/utils/date-utils";
import { keys } from "@/lib/utils/keys";
import type {
  HorizontalRowSpec,
  PluginView,
  Resource,
  VerticalColumnSpec,
  ViewConfig,
} from "@/types/index";
import { endOf, format, startOf, weekday } from "@/utils/temporal";

const getVisibleDays = (
  date: Temporal.ZonedDateTime,
  config: ViewConfig
): Temporal.ZonedDateTime[] => {
  const weekDays = getWeekDays(date, config.firstDayOfWeek);
  const { hiddenDays } = config;

  if (!hiddenDays) {
    return weekDays;
  }

  return weekDays.filter((day) => !hiddenDays.has(weekday(day)));
};

const isHourlyGranularity = (config: ViewConfig): boolean =>
  (config.weekViewGranularity ?? "hourly") === "hourly";

const WeekViewHeader: React.FC<{
  date: Temporal.ZonedDateTime;
  config: ViewConfig;
}> = ({ date, config }) => {
  const { t, selectDate, openEventForm } = useSmartCalendarContext((c) => ({
    openEventForm: c.openEventForm,
    selectDate: c.selectDate,
    t: c.t,
  }));

  const visibleDays = getVisibleDays(date, config);

  return (
    <div
      className="bg-border flex h-18 flex-1 gap-px"
      data-testid="week-view-header"
    >
      {/* Corner cell with week number — mirrors the responsive gutter width. */}
      <div
        className={cn(
          RESPONSIVE_GUTTER_WIDTH,
          "bg-background flex h-full shrink-0 items-center justify-center p-2",
          STICKY_GUTTER_SHADOW
        )}
      >
        <div className="flex w-full min-w-0 flex-col items-center justify-center">
          <span className="text-muted-foreground w-full truncate text-center text-xs">
            {t("week")}
          </span>
          <span className="w-full truncate text-center font-medium">
            {date.weekOfYear}
          </span>
        </div>
      </div>

      {/* Day header cells */}
      {visibleDays.map((day, _index) => {
        const today = isToday(day);
        const key = keys.header.week.day(day);

        const handleDayClick = () => {
          selectDate(day);
          openEventForm({ start: day });
        };

        return (
          <button
            className={cn(
              "bg-background hover:bg-accent flex h-full w-20 min-w-0 flex-1 cursor-pointer flex-col justify-center p-1 text-center sm:p-2"
            )}
            data-testid={keys.header.weekday("week", format(day, "dddd"))}
            key={key}
            onClick={handleDayClick}
            type="button"
          >
            <AnimatedSection transitionKey={key}>
              <DayLabel
                dayNumber={format(day, "D")}
                today={today}
                weekday={format(day, "ddd")}
              />
            </AnimatedSection>
          </button>
        );
      })}
    </div>
  );
};

const weekHoursFor = (
  day: Temporal.ZonedDateTime,
  config: ViewConfig,
  allDates?: Temporal.ZonedDateTime[]
): Temporal.ZonedDateTime[] =>
  getViewHours({
    allDates,
    businessHours: config.businessHours,
    hideNonBusinessHours: config.hideNonBusinessHours,
    referenceDate: day,
    resourceBusinessHours: collectResourceBusinessHours(config.resources ?? []),
  });

const resourceWeekVerticalColumns = (
  date: Temporal.ZonedDateTime,
  config: ViewConfig,
  resources: Resource[]
): VerticalColumnSpec[] => {
  const weekDays = getWeekDays(date, config.firstDayOfWeek);

  if (isHourlyGranularity(config)) {
    const visibleDays = getVisibleDays(date, config);

    // Day-major order: each visible day's resource columns are grouped under
    // that day (day outer, resources inner), matching the two-row header.
    return [
      gutterColumn({
        days: weekHoursFor(date, config, weekDays),
        gridType: "hour",
      }),
      ...visibleDays.flatMap((day) =>
        resources.map((resource) => ({
          className: RESOURCE_CELL_WIDTH,
          days: weekHoursFor(day, config, weekDays),
          gridType: "hour" as const,
          id: keys.col.day(day, resource.id),
          day,
          resource,
        }))
      ),
    ];
  }

  // Uses `weekDays` (all 7) intentionally, not `visibleDays`. Non-contiguous
  // visible days would break multi-day event positioning, so `hiddenDays` is
  // not supported in daily granularity.
  return resourceVerticalColumns({
    columnsFor: (resource) => ({
      className: RESOURCE_CELL_WIDTH,
      days: weekDays,
      gridType: "day" as const,
      id: keys.col.resource("week", resource.id),
    }),
    gutter: gutterColumn({
      days: weekDays,
      gridType: "day",
      renderLabel: (day: Temporal.ZonedDateTime) => (
        <DayLabel
          dayNumber={format(day, "D")}
          today={isToday(day)}
          weekday={format(day, "ddd")}
        />
      ),
    }),
    resources,
  });
};

const resourceWeekHorizontalRows = (
  date: Temporal.ZonedDateTime,
  config: ViewConfig,
  resources: Resource[]
): HorizontalRowSpec[] => {
  const weekDays = getWeekDays(date, config.firstDayOfWeek);

  if (isHourlyGranularity(config)) {
    const weekHours = weekDays.map((day) => weekHoursFor(day, config));

    return resourceHorizontalRows({
      cellClassName: RESOURCE_CELL_WIDTH,
      days: weekHours,
      gridType: "hour",
      resources,
    });
  }

  return resourceHorizontalRows({
    cellClassName: RESOURCE_CELL_WIDTH,
    days: weekDays,
    gridType: "day",
    resources,
  });
};

const ResourceWeekVerticalHeader: React.FC<{
  date: Temporal.ZonedDateTime;
  config: ViewConfig;
  resources: Resource[];
}> = ({ date, config, resources }) => {
  const visibleDays = getVisibleDays(date, config);
  const isHourly = isHourlyGranularity(config);

  if (!isHourly) {
    return <ResourceWeekVerticalResourceHeader resources={resources} />;
  }

  // Day row on top, each day spanning its resources; resource row below.
  return (
    <div className="flex flex-1 flex-col">
      <ResourceWeekVerticalDayHeader days={visibleDays} resources={resources} />
      <ResourceWeekVerticalResourceHeader
        days={visibleDays}
        resources={resources}
      />
    </div>
  );
};

const ResourceWeekHorizontalHeader: React.FC<{
  date: Temporal.ZonedDateTime;
  config: ViewConfig;
  resources: Resource[];
}> = ({ date, config }) => {
  const weekDays = getWeekDays(date, config.firstDayOfWeek);
  const isHourly = isHourlyGranularity(config);

  const weekHours = isHourly
    ? weekDays.flatMap((day) => weekHoursFor(day, config))
    : [];

  return (
    <>
      <ResourcesCornerCell />
      <div className="flex flex-1 flex-col">
        <ResourceWeekHorizontalDayHeader days={weekDays} />
        {isHourly && <TimeHeaderRow hours={weekHours} view="week" />}
      </div>
    </>
  );
};

const weekColumns = (
  date: Temporal.ZonedDateTime,
  config: ViewConfig
): VerticalColumnSpec[] | HorizontalRowSpec[] => {
  const resources = config.resources ?? [];

  if (resources.length) {
    if (config.orientation === "vertical") {
      return resourceWeekVerticalColumns(date, config, resources);
    }

    return resourceWeekHorizontalRows(date, config, resources);
  }

  const weekDays = getWeekDays(date, config.firstDayOfWeek);
  const visibleDays = getVisibleDays(date, config);

  return [
    gutterColumn({
      days: weekHoursFor(date, config, weekDays),
      gridType: "hour",
      widthClassName: RESPONSIVE_GUTTER_WIDTH,
    }),
    // Each day column gets its own hours on the correct date.
    ...visibleDays.map((day) => ({
      day,
      className: "flex-1 min-w-0",
      days: weekHoursFor(day, config, weekDays),
      gridType: "hour" as const,
      id: keys.col.day(day),
    })),
  ];
};

export const weekView: PluginView = {
  columns: weekColumns,
  icon: Columns3,
  label: "week",
  layout: "vertical",
  name: "week",
  navigationUnit: "week",
  range: (date, config) => {
    const days = getWeekDays(date, config.firstDayOfWeek);
    const weekStart = days.at(0) ?? date;
    const weekEnd = days.at(-1) ?? date;

    return { end: endOf(weekEnd, "day"), start: startOf(weekStart, "day") };
  },
  renderHeader: ({ date, config }) => {
    const resources = config.resources ?? [];

    if (!resources.length) {
      return <WeekViewHeader config={config} date={date} />;
    }

    if (config.orientation === "vertical") {
      return (
        <ResourceWeekVerticalHeader
          config={config}
          date={date}
          resources={resources}
        />
      );
    }

    return (
      <ResourceWeekHorizontalHeader
        config={config}
        date={date}
        resources={resources}
      />
    );
  },
  supportsResources: true,
};
