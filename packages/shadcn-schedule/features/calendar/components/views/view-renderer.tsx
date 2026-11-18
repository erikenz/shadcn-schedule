import type React from "react";
import { useMemo } from "react";

import { AllDayRow } from "@/components/all-day-row/all-day-row";
import { HorizontalGrid } from "@/components/horizontal-grid/horizontal-grid";
import { RESPONSIVE_GUTTER_WIDTH } from "@/components/vertical-grid/gutter";
import { VerticalGrid } from "@/components/vertical-grid/vertical-grid";
import { ResourceAllDayRows } from "@/features/calendar/components/views/resource-axis";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { GROUPED_HEADER_HEIGHT } from "@/lib/constants";
import { hasValue } from "@/lib/guards";
import type {
  HorizontalRowSpec,
  PluginView,
  VerticalColumnSpec,
  ViewConfig,
} from "@/types/index";

// Contract rule, not a runtime check: a view declaring `layout: 'vertical'`
// returns VerticalColumnSpec[] from columns() (see PluginView.columns TSDoc).
const isVerticalSpecs = (
  _specs: VerticalColumnSpec[] | HorizontalRowSpec[],
  engine: "vertical" | "horizontal"
): _specs is VerticalColumnSpec[] => engine === "vertical";

interface EngineViewProps {
  composesResourceAxis: boolean;
  header: React.ReactNode;
  variant: "resource" | "regular";
}

/** The 'vertical' engine branch: column specs → VerticalGrid. */
const VerticalEngineView: React.FC<
  EngineViewProps & { specs: VerticalColumnSpec[] }
> = ({ specs, header, composesResourceAxis, variant }) => {
  const { slotDuration } = useSmartCalendarContext((c) => ({
    slotDuration: c.slotDuration,
  }));

  const gridType = specs.some((col) => col.gridType === "hour")
    ? "hour"
    : "day";

  const eventDays = specs.flatMap((col) =>
    col.noEvents !== true && col.day ? [col.day] : []
  );

  // The all-day spacer must mirror the gutter column's width. Views on the
  // responsive gutter (week) need the matching responsive spacer plus
  // shrinkable cells — regardless of how many days hiddenDays leaves
  // visible; views on the fixed-width gutter (day) align with the
  // AllDayCell default already.
  const gutterCol = specs.find((col) => col.noEvents === true);

  const usesResponsiveGutter = Boolean(
    gutterCol?.className?.includes(RESPONSIVE_GUTTER_WIDTH)
  );

  const allDayClasses = usesResponsiveGutter
    ? { cell: "flex-1 min-w-0", spacer: RESPONSIVE_GUTTER_WIDTH }
    : undefined;

  // Resource columns get one all-day row per resource (derived from the
  // resource identity the specs carry); regular columns share one row.
  let allDayRow: React.ReactNode;

  if (gridType === "hour") {
    allDayRow = composesResourceAxis ? (
      <ResourceAllDayRows columns={specs} />
    ) : (
      <AllDayRow classes={allDayClasses} days={eventDays} />
    );
  }

  // Resource grids rely on the min-w-full/w-fit defaults so wide column
  // sets keep header and body aligned while scrolling.
  const verticalClasses = composesResourceAxis
    ? undefined
    : { allDay: "w-full", body: "w-full", header: "w-full" };

  return (
    <VerticalGrid
      allDayRow={allDayRow}
      classes={verticalClasses}
      columns={specs}
      gridType={gridType}
      slotDurationMinutes={slotDuration}
      variant={variant}
    >
      {header}
    </VerticalGrid>
  );
};

/** The 'horizontal' engine branch: row specs → HorizontalGrid. */
const HorizontalEngineView: React.FC<
  EngineViewProps & { specs: HorizontalRowSpec[] }
> = ({ specs, header, composesResourceAxis, variant }) => {
  const gridType = specs.some(
    (row) => row.columns?.some((cell) => cell.gridType === "hour") === true
  )
    ? "hour"
    : "day";

  // Grouped cells (a day's hour slots) need the taller two-row header.
  const hasGroupedCells = specs.some(
    (row) => row.columns?.some((cell) => hasValue(cell.days)) === true
  );

  const horizontalClasses = composesResourceAxis
    ? {
        body: "min-w-full",
        header: cn(hasGroupedCells && GROUPED_HEADER_HEIGHT, "min-w-full"),
      }
    : { body: "w-full", header: "w-full" };

  return (
    <HorizontalGrid
      classes={horizontalClasses}
      dayNumberHeight={composesResourceAxis ? 0 : undefined}
      gridType={gridType}
      rows={specs}
      variant={variant}
    >
      {header}
    </HorizontalGrid>
  );
};

/**
 * The three-way view dispatcher: 'vertical' → VerticalGrid, 'horizontal' →
 * HorizontalGrid, no columns/layout → the view's `component` (escape hatch).
 * Engine rule: resources + a resource-capable view → the calendar-level
 * `orientation`; otherwise the view's own `layout`.
 */
export const ViewRenderer: React.FC<{ view: PluginView }> = ({ view }) => {
  const {
    currentDate,
    firstDayOfWeek,
    hiddenDays,
    businessHours,
    hideNonBusinessHours,
    resources,
    orientation,
    resourceColumnWidth,
    resourceWidth,
    weekViewGranularity,
  } = useSmartCalendarContext((c) => ({
    businessHours: c.businessHours,
    currentDate: c.currentDate,
    firstDayOfWeek: c.firstDayOfWeek,
    hiddenDays: c.hiddenDays,
    hideNonBusinessHours: c.hideNonBusinessHours,
    orientation: c.orientation,
    resourceColumnWidth: c.resourceColumnWidth,
    resourceWidth: c.resourceWidth,
    resources: c.resources,
    weekViewGranularity: c.weekViewGranularity,
  }));

  const config = useMemo<ViewConfig>(
    () => ({
      businessHours,
      firstDayOfWeek,
      hiddenDays,
      hideNonBusinessHours,
      orientation,
      resourceColumnWidth,
      resourceWidth,
      resources,
      weekViewGranularity,
    }),
    [
      firstDayOfWeek,
      hiddenDays,
      businessHours,
      hideNonBusinessHours,
      resources,
      orientation,
      resourceColumnWidth,
      resourceWidth,
      weekViewGranularity,
    ]
  );

  // Memoized so the grids' memo()d columns/rows see stable references;
  // deps are exhaustive.
  const specs = useMemo(
    () => view.columns?.(currentDate, config),
    [view, currentDate, config]
  );

  if (!(specs && view.layout)) {
    const EscapeHatch = view.component;

    if (EscapeHatch) {
      return <EscapeHatch />;
    }

    return null;
  }

  const hasResources = Boolean(resources?.length);
  const composesResourceAxis = hasResources && Boolean(view.supportsResources);
  // With resources on a resource-capable view the user's `orientation` picks
  // the engine; otherwise the view's own `layout` does.
  const engine = composesResourceAxis ? orientation : view.layout;
  const variant = composesResourceAxis ? "resource" : "regular";
  const header = view.renderHeader?.({ config, date: currentDate });

  if (isVerticalSpecs(specs, engine)) {
    return (
      <VerticalEngineView
        composesResourceAxis={composesResourceAxis}
        header={header}
        specs={specs}
        variant={variant}
      />
    );
  }

  return (
    <HorizontalEngineView
      composesResourceAxis={composesResourceAxis}
      header={header}
      specs={specs}
      variant={variant}
    />
  );
};
