import type React from "react";
import { useRef } from "react";

import { HorizontalGridHeaderContainer } from "@/components/horizontal-grid/horizontal-grid-header-container";
import { HorizontalGridRow } from "@/components/horizontal-grid/horizontal-grid-row";
import type { HorizontalGridRowProps } from "@/components/horizontal-grid/horizontal-grid-row";
import { useScrollToTime } from "@/components/vertical-grid/use-scroll-to-time";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { hasNumber, hasValue } from "@/lib/guards";
import { format } from "@/utils/temporal";

interface HorizontalGridProps {
  allDay?: boolean;
  children?: React.ReactNode;
  classes?: { header?: string; body?: string };
  dayNumberHeight?: number;
  gridType?: "day" | "hour";
  rows: HorizontalGridRowProps[];
  variant?: "regular" | "resource";
}

export const HorizontalGrid: React.FC<HorizontalGridProps> = ({
  rows,
  children,
  classes,
  allDay: topLevelAllDay,
  gridType,
  variant = "resource",
  dayNumberHeight,
}) => {
  const { currentDate, view, scrollTime } = useSmartCalendarContext();
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const isResourceCalendar = variant === "resource";
  const isRegularCalendar = !isResourceCalendar;
  const canHorizontalScrollToHour = gridType === "hour" && isResourceCalendar;

  const resourceRowHeight = useSmartCalendarContext(
    (state) => state.resourceRowHeight
  );

  // Fixed-height hour rows own their height: the consumer sizes the grid, so
  // the scroller must not scroll vertically. Allowing it hid the header on
  // scroll and pushed the rows out of alignment with their labels.
  const fixedRowHeight = gridType === "hour" && hasNumber(resourceRowHeight);

  useScrollToTime({
    axis: "horizontal",
    enabled: canHorizontalScrollToHour,
    scrollKey: `${view}-${format(currentDate, "YYYY-MM-DD")}`,
    scrollTime,
    viewportRef,
  });

  const header = hasValue(children) && (
    <HorizontalGridHeaderContainer className={classes?.header}>
      {children}
    </HorizontalGridHeaderContainer>
  );

  return (
    <div
      className="flex h-full flex-col"
      data-testid="horizontal-grid-container"
    >
      {/**
       * header row is rendered outside scroll area for regular calendar
       */}
      {isRegularCalendar && header}

      {/**
       * Plain scroll container (no ScrollArea wrapper): scrolls horizontally
       * over the time columns and vertically over the rows. The ref is the
       * element useScrollToTime scrolls.
       */}
      <div
        className={cn(
          "h-full",
          fixedRowHeight ? "overflow-x-auto overflow-y-hidden" : "overflow-auto"
        )}
        data-testid="horizontal-grid-scroll"
        ref={viewportRef}
      >
        {/**
         * Header and body share one width authority: two independent `w-fit`
         * flex containers divided the same space slightly differently, so the
         * hour labels drifted from the grid lines towards the right edge.
         */}
        <div className="flex w-full flex-col">
          {/**
           * header row for resource calendar inside scroll area
           */}
          {isResourceCalendar && header}

          {/* Calendar area with scroll */}
          <div
            className={cn("flex w-full flex-1", classes?.body)}
            data-testid="horizontal-grid-body"
          >
            <div
              className="bg-border relative flex w-full flex-1 flex-col gap-px"
              data-calendar-scroll-content="true"
              key={format(currentDate, "YYYY-MM")}
            >
              {rows.map((row) => (
                <HorizontalGridRow
                  allDay={row.allDay ?? topLevelAllDay}
                  dayNumberHeight={dayNumberHeight}
                  gridType={gridType}
                  key={row.id}
                  variant={variant}
                  {...row}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
