import type React from "react";
import type { Temporal } from "temporal-polyfill";

import { AllDayCell } from "@/components/all-day-row/all-day-cell";
import { AllDayRow } from "@/components/all-day-row/all-day-row";
import { ResourceCell } from "@/components/resource-cell";
import {
  GUTTER_WIDTH,
  STICKY_GUTTER_SHADOW,
} from "@/components/vertical-grid/gutter";
import { useOptionalCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
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
  HorizontalRowSpec,
  Resource,
  VerticalColumnSpec,
} from "@/types/index";

export { RESOURCE_ROW_LABEL_WIDTH };

/**
 * Width contract of one resource cell: header cells and body columns must
 * use the same utilities or the axis misaligns.
 */
export const RESOURCE_CELL_WIDTH = "min-w-0 flex-1";

interface ResourceHorizontalRowsOptions {
  cellClassName?: string;
  /** Flat cells (one date each) or grouped cells (e.g. one day's hour slots). */
  days: Temporal.ZonedDateTime[] | Temporal.ZonedDateTime[][];
  gridType: "day" | "hour";
  resources: Resource[];
}

/**
 * Horizontal arrangement of the resource axis: one row per resource over the
 * same date cells (resources as rows, time flows across).
 */
export const resourceHorizontalRows = ({
  resources,
  days,
  gridType,
  cellClassName,
}: ResourceHorizontalRowsOptions): HorizontalRowSpec[] => {
  const columns = days.map((day) => {
    const isArray = Array.isArray(day);
    const refDay = isArray ? day.at(0) : day;

    return {
      gridType,
      className: cellClassName,
      day: isArray ? undefined : day,
      days: isArray ? day : undefined,
      id: refDay ? keys.col.day(refDay) : "day-col-unknown",
    };
  });

  return resources.map((resource) => ({
    columns,
    resource,
    id: String(resource.id),
  }));
};

/** Column spec(s) for one resource; `resourceVerticalColumns` attaches the resource. */
type ResourceColumnSeed = Omit<VerticalColumnSpec, "resource">;

interface ResourceVerticalColumnsOptions {
  columnsFor: (resource: Resource) => ResourceColumnSeed | ResourceColumnSeed[];
  /** The leading label column (time or date gutter), built via `gutterColumn`. */
  gutter: VerticalColumnSpec;
  resources: Resource[];
}

/**
 * Vertical arrangement of the resource axis: the gutter column followed by
 * each resource's column(s) (resources as columns, time flows down).
 */
export const resourceVerticalColumns = ({
  resources,
  gutter,
  columnsFor,
}: ResourceVerticalColumnsOptions): VerticalColumnSpec[] => [
  gutter,
  ...resources.flatMap((resource) => {
    const seeds = columnsFor(resource);
    const seedList = Array.isArray(seeds) ? seeds : [seeds];

    return seedList.map((seed) => ({ ...seed, resource }));
  }),
];

/**
 * Header row for vertical resource arrangements (day/month): a gutter-width
 * corner plus one ResourceCell per resource column.
 */
export const ResourceColumnsHeader: React.FC<{ resources: Resource[] }> = ({
  resources,
}) => (
  <div
    className="bg-border flex h-12 w-full flex-1 gap-px"
    data-testid={keys.header.resource.columnsHeader}
  >
    <div
      className={cn(
        "bg-background sticky top-0 left-0 z-20 shrink-0",
        GUTTER_WIDTH,
        STICKY_GUTTER_SHADOW
      )}
    />
    {resources.map((resource) => (
      <ResourceCell
        className={cn(RESOURCE_CELL_WIDTH, "bg-background")}
        key={keys.listKey("resource-cell", resource.id)}
        resource={resource}
      />
    ))}
  </div>
);

export interface ResourcesCornerCellProps {
  className?: string;
  style?: React.CSSProperties;
  "data-testid"?: string;
}

/** The sticky "Resources" corner cell of horizontal resource arrangements. */
/** Empty corner cell: the row labels below say what the column is. */
export const ResourcesCornerCell: React.FC<ResourcesCornerCellProps> = ({
  className,
  style,
  "data-testid": dataTestId,
}) => {
  const { classesOverride, resourceColumnWidth, resourceWidth } =
    useOptionalCalendarContext((s) => ({
      classesOverride: s.classesOverride,
      resourceColumnWidth: s.resourceColumnWidth,
      resourceWidth: s.resourceWidth,
    }));

  const customWidth = resourceColumnWidth ?? resourceWidth;
  const customWidthClass = extractWidthClass(customWidth);

  const { finalCornerClass } = resolveResourceClasses(
    classesOverride,
    customWidthClass
  );

  const cornerClassToMerge =
    className !== undefined && className !== ""
      ? cn(finalCornerClass, className)
      : finalCornerClass;

  const cornerHasWidth = hasWidthClass(cornerClassToMerge);

  const cornerStyle = computeResourceWidthStyle({
    customWidth,
    extraStyle: style,
    hasWidthInClasses: cornerHasWidth,
  });

  return (
    <div
      className={cn(
        "bg-background sticky top-0 left-0 z-22 min-w-0 border-r border-b",
        cleanMergeResourceWidth(RESOURCE_ROW_LABEL_WIDTH, cornerClassToMerge)
      )}
      data-testid={dataTestId ?? keys.header.resource.cornerCell}
      style={cornerStyle}
    />
  );
};

interface ResourceAllDayGroup {
  days: Temporal.ZonedDateTime[];
  resource: Resource;
  seenDayKeys: Set<string>;
}

/**
 * The all-day block of vertical resource arrangements: the "All day" label
 * cell plus one AllDayRow per resource, derived from the resource identity the
 * column specs already carry (column order is preserved).
 */
export const ResourceAllDayRows: React.FC<{
  columns: VerticalColumnSpec[];
}> = ({ columns }) => {
  const groups: ResourceAllDayGroup[] = [];
  const groupsByResourceId = new Map<string | number, ResourceAllDayGroup>();

  for (const column of columns) {
    if (!column.resource || column.noEvents === true || !column.day) {
      continue;
    }

    let group = groupsByResourceId.get(column.resource.id);

    if (!group) {
      group = { days: [], resource: column.resource, seenDayKeys: new Set() };
      groupsByResourceId.set(column.resource.id, group);
      groups.push(group);
    }

    const dayKey = getDayKey(column.day);

    if (!group.seenDayKeys.has(dayKey)) {
      group.seenDayKeys.add(dayKey);
      group.days.push(column.day);
    }
  }

  return (
    <div className="bg-border flex w-full gap-px">
      <AllDayCell />
      {groups.map(({ resource, days }) => (
        <AllDayRow
          classes={{
            cell: cn("min-w-0 flex-1", days.length > 1 && "flex-1"),
          }}
          days={days}
          key={keys.allDayRow(resource.id)}
          resource={resource}
          showSpacer={false}
        />
      ))}
    </div>
  );
};
