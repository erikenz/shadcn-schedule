import type React from "react";
import { useRef } from "react";

import { useScrollToTime } from "@/components/vertical-grid/use-scroll-to-time";
import { VerticalGridCol } from "@/components/vertical-grid/vertical-grid-col";
import type { VerticalGridColProps } from "@/components/vertical-grid/vertical-grid-col";
import { VerticalGridHeaderContainer } from "@/components/vertical-grid/vertical-grid-header-container";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { hasValue } from "@/lib/guards";
import { keys } from "@/lib/utils/keys";
import { format } from "@/utils/temporal";

interface VerticalGridProps {
  allDayRow?: React.ReactNode;
  children?: React.ReactNode;
  classes?: { header?: string; body?: string; allDay?: string };
  columns: VerticalGridColProps[];
  gridType?: "day" | "hour";
  /**
   * Granularity of each hour row in minutes. Forwarded to VerticalGridCol.
   */
  slotDurationMinutes?: number;
  style?: React.CSSProperties;
  variant?: "regular" | "resource";
}

export const VerticalGrid: React.FC<VerticalGridProps> = ({
  columns,
  children,
  gridType = "day",
  variant: _variant = "resource",
  classes,
  allDayRow,
  slotDurationMinutes,
  style,
}) => {
  // Triggered when `hideNonBusinessHours` filters every column to zero hours
  // (e.g. business hours `startTime: 0, endTime: 0`). The all-day row takes
  // the freed vertical space so the view doesn't render an empty time grid.
  const expandAllDayRow = columns.every((c) => !c.days?.length);

  const { currentDate, view, scrollTime } = useSmartCalendarContext();
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const hasHoursToScroll = gridType === "hour" && !expandAllDayRow;

  useScrollToTime({
    enabled: hasHoursToScroll,
    scrollKey: `${view}-${format(currentDate, "YYYY-MM-DD")}`,
    scrollTime,
    viewportRef,
  });

  const header = hasValue(children) && (
    <VerticalGridHeaderContainer
      allDayRow={allDayRow}
      classes={{ allDay: classes?.allDay, header: classes?.header }}
      expandAllDayRow={expandAllDayRow}
    >
      {children}
    </VerticalGridHeaderContainer>
  );

  // When all columns are empty (no hours to display), skip the ScrollArea
  // entirely so the header (with the expanded all-day row) takes the full
  // container height. h-full on a flex child only resolves correctly against
  // a parent with a definite height, and Radix's Viewport wrapper has only
  // min-height (not explicit height), which is why the all-day row's
  // flex-1 wouldn't grow when nested inside the ScrollArea.
  if (expandAllDayRow && hasValue(header)) {
    return (
      <div
        className="flex h-full flex-col"
        data-testid="vertical-grid-container"
        style={style}
      >
        {header}
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col"
      data-testid="vertical-grid-container"
      style={style}
    >
      {/**
       * Plain scroll container (no ScrollArea wrapper): the body's `min-w-full`
       * fills the viewport width while `w-fit` allows horizontal scrolling when
       * the columns exceed it, and the container scrolls vertically over the
       * time rows. The ref is the element useScrollToTime scrolls.
       *
       * The header is placed inside the scroll container for both regular and
       * resource variants. When `stickyViewHeader` is enabled, it sticks to top
       * with `sticky top-0 z-21`. Placing it inside guarantees its width exactly
       * matches the body columns (sharing the scrollbar gutter) so day divider
       * lines align perfectly with the grid lines below.
       */}
      <div
        className="h-full overflow-auto"
        data-testid="vertical-grid-scroll"
        ref={viewportRef}
      >
        {header}
        {/* Calendar area with scroll. gap-px + bg-border draws the vertical
						    separators between columns through the gaps. */}
        <div
          className={cn(
            "bg-border relative flex w-fit min-w-full flex-1 gap-px",
            classes?.body
          )}
          data-calendar-scroll-content="true"
          data-testid="vertical-grid-body"
        >
          {columns.map((column, index) => (
            <VerticalGridCol
              key={keys.listKey(column.id, index)}
              {...column}
              gridType={gridType}
              slotDurationMinutes={slotDurationMinutes}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
