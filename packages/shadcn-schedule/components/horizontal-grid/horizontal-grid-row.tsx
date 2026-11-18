import type React from "react";
import { memo, useMemo } from "react";
import type { Temporal } from "temporal-polyfill";

import { GridCell } from "@/components/grid-cell";
import { HorizontalGridEventsLayer } from "@/components/horizontal-grid/horizontal-grid-events-layer";
import { ResourceCell } from "@/components/resource-cell";
import { useProcessedWeekEvents } from "@/features/calendar/hooks/use-processed-week-events";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { RESOURCE_ROW_LABEL_WIDTH } from "@/lib/constants";
import { getDayKey } from "@/lib/utils/date-utils";
import { keys } from "@/lib/utils/keys";
import {
  cleanMergeResourceWidth,
  computeResourceWidthStyle,
  extractWidthClass,
  hasWidthClass,
  resolveResourceClasses,
} from "@/lib/utils/resource-width";
import type {
  HorizontalCellSpec,
  HorizontalRowSpec,
  Resource,
} from "@/types/index";
import { toISOString } from "@/utils/temporal";

interface HorizontalGridColumn extends HorizontalCellSpec {
  renderCell?: (row: HorizontalGridRowProps) => React.ReactNode;
}

export interface HorizontalGridRowProps extends HorizontalRowSpec {
  allDay?: boolean;
  columns?: HorizontalGridColumn[];
  dayNumberHeight?: number;
  gridType?: "day" | "hour";
  variant?: "regular" | "resource";
}

/**
 * A column containing multiple days (e.g., one day's hourly slots in resource week view).
 * Needs its own useProcessedWeekEvents call since events are scoped to this day group.
 */
const NoMemoGroupedColumn = ({
  col,
  gridType = "day",
  allDay,
  resource,
  resourceId,
  dayNumberHeight,
  showDayNumber,
  id,
}: {
  col: HorizontalGridColumn;
  gridType?: "day" | "hour";
  allDay?: boolean;
  resource?: Resource;
  resourceId?: string | number;
  dayNumberHeight?: number;
  showDayNumber: boolean;
  id: string | number;
}) => {
  const days = col.days ?? [];

  const { positionedEvents } = useProcessedWeekEvents({
    allDay,
    days,
    gridType,
    resourceId,
  });

  return (
    <div className="relative flex w-full">
      {/* gap-px + bg-border draws the day separators within the group. */}
      <div className="bg-border flex w-full gap-px">
        {days.map((day) => (
          <GridCell
            allDay={allDay}
            className={cn("w-20 flex-1", col.className)}
            day={day}
            gridType={gridType}
            hour={gridType === "hour" ? day.hour : undefined}
            key={toISOString(day)}
            resourceId={resourceId}
            showDayNumber={showDayNumber}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        <HorizontalGridEventsLayer
          data-testid={keys.container.eventsLayer("horizontal", id)}
          dayNumberHeight={dayNumberHeight}
          days={days}
          gridType={gridType}
          positionedEvents={positionedEvents}
          resource={resource}
          resourceId={resourceId}
        />
      </div>
    </div>
  );
};

const GroupedColumn = memo(NoMemoGroupedColumn);

const EMPTY_COLUMNS: never[] = [];

const NoMemoHorizontalGridRow: React.FC<HorizontalGridRowProps> = ({
  id,
  resource,
  gridType = "day",
  variant = "resource",
  dayNumberHeight,
  className,
  columns = EMPTY_COLUMNS,
  allDay,
  showDayNumber = false,
}) => {
  const {
    renderResource,
    classesOverride,
    resourceColumnWidth,
    resourceWidth,
  } = useSmartCalendarContext((c) => ({
    classesOverride: c.classesOverride,
    renderResource: c.renderResource,
    resourceColumnWidth: c.resourceColumnWidth,
    resourceWidth: c.resourceWidth,
  }));

  const isResourceCalendar = variant === "resource";
  // Flat columns: each column has col.day (regular month, resource month)
  // Grouped columns: each column has col.days[] (resource week horizontal)
  const isGrouped = columns.some((col) => col.days);

  const customWidth = resourceColumnWidth ?? resourceWidth;
  const customWidthClass = extractWidthClass(customWidth);

  const { finalLabelClass } = resolveResourceClasses(
    classesOverride,
    customWidthClass
  );

  const labelHasWidth = hasWidthClass(finalLabelClass);

  const rowResourceStyle = computeResourceWidthStyle({
    customWidth,
    hasWidthInClasses: labelHasWidth,
  });

  // Collect all days for flat rows
  const flatDays = useMemo(() => {
    if (isGrouped) {
      return [];
    }

    return columns
      .map((col) => col.day)
      .filter((d): d is Temporal.ZonedDateTime => Boolean(d));
  }, [columns, isGrouped]);

  // Compute events once at the row level — shared between GridCells and events layer
  const { positionedEvents, dayEventsMap } = useProcessedWeekEvents({
    allDay,
    gridType,
    days: flatDays,
    resourceId: resource?.id,
  });

  return (
    <div
      className={cn("relative flex min-w-0 flex-1", className)}
      data-testid={keys.container.horizontal.row(id)}
    >
      {isResourceCalendar && resource ? (
        <ResourceCell
          className={cn(
            "bg-background sticky left-0 z-20 flex h-full min-w-0 items-center border-r p-2",
            cleanMergeResourceWidth(RESOURCE_ROW_LABEL_WIDTH, finalLabelClass)
          )}
          data-testid={keys.container.horizontal.rowLabel(resource.id)}
          resource={resource}
          style={rowResourceStyle}
        >
          {renderResource ? (
            renderResource(resource)
          ) : (
            // oxlint-disable-next-line github/a11y-no-title-attribute -- native tooltip for truncated resource label
            <div
              className="w-full min-w-0 truncate text-sm leading-tight font-medium"
              title={resource.title}
            >
              {resource.title}
            </div>
          )}
        </ResourceCell>
      ) : null}
      <div className="relative flex min-w-0 flex-1">
        {/* gap-px + bg-border draws the vertical separators between cells. */}
        <div className="bg-border flex w-full min-w-0 gap-px">
          {columns.map((col) => {
            if (col.days) {
              return (
                <GroupedColumn
                  allDay={allDay}
                  col={col}
                  dayNumberHeight={dayNumberHeight}
                  gridType={gridType}
                  id={id}
                  key={col.id}
                  resource={resource}
                  resourceId={resource?.id}
                  showDayNumber={showDayNumber}
                />
              );
            }

            return col.day ? (
              <GridCell
                allDay={allDay}
                className={cn("w-20 flex-1", col.className)}
                day={col.day}
                gridType={gridType}
                hour={gridType === "hour" ? col.day.hour : undefined}
                key={toISOString(col.day)}
                precomputedEvents={dayEventsMap.get(getDayKey(col.day))}
                resourceId={resource?.id}
                shouldRenderEvents={gridType !== "hour"}
                showDayNumber={showDayNumber}
              />
            ) : null;
          })}
        </div>

        {/* Events layer positioned absolutely over the row */}
        {!isGrouped && (
          <div className="pointer-events-none absolute inset-0 z-10">
            <HorizontalGridEventsLayer
              data-testid={keys.container.eventsLayer("horizontal", id)}
              dayNumberHeight={dayNumberHeight}
              days={flatDays}
              gridType={gridType}
              positionedEvents={positionedEvents}
              resource={resource}
              resourceId={resource?.id}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const HorizontalGridRow = memo(NoMemoHorizontalGridRow);
