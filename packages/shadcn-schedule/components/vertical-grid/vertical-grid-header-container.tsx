import { memo } from "react";

import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { hasValue } from "@/lib/guards";

interface VerticalGridHeaderContainerProps {
  allDayRow?: React.ReactNode;
  children?: React.ReactNode;
  classes?: { header?: string; allDay?: string };
  expandAllDayRow?: boolean;
}

const NoMemoVerticalGridHeaderContainer: React.FC<
  VerticalGridHeaderContainerProps
> = ({ children, classes, allDayRow, expandAllDayRow = false }) => {
  const { stickyViewHeader, viewHeaderClassName } = useSmartCalendarContext(
    (state) => ({
      stickyViewHeader: state.stickyViewHeader,
      viewHeaderClassName: state.viewHeaderClassName,
    })
  );

  const TotalWidthClass = "min-w-full w-fit";

  return (
    <div
      // Z-index above the left sticky resource column
      className={cn(
        TotalWidthClass,
        expandAllDayRow && "flex h-full flex-col",
        stickyViewHeader && "bg-background sticky top-0 z-21",
        viewHeaderClassName
      )}
    >
      <div
        className={cn("min-h-12 border-b", TotalWidthClass, classes?.header)}
        data-testid="vertical-grid-header"
      >
        {children}
      </div>
      {/* All-day row. border-b: the all-day/time-grid separator, owned here so
			    it spans the full width below the sticky gutter and is drawn once. */}
      {hasValue(allDayRow) ? (
        <div
          className={cn(
            "flex min-h-12 border-b",
            TotalWidthClass,
            expandAllDayRow && "flex-1 overflow-hidden",
            classes?.allDay
          )}
          data-testid="vertical-grid-all-day"
        >
          {allDayRow}
        </div>
      ) : null}
    </div>
  );
};

export const VerticalGridHeaderContainer = memo(
  NoMemoVerticalGridHeaderContainer
);
