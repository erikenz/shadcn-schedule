import { memo } from "react";

import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";

interface HorizontalGridHeaderContainerProps {
  children?: React.ReactNode;
  className?: string;
}

const NoMemoHorizontalGridHeaderContainer = ({
  children,
  className,
}: HorizontalGridHeaderContainerProps) => {
  const { stickyViewHeader, viewHeaderClassName } = useSmartCalendarContext(
    (state) => ({
      stickyViewHeader: state.stickyViewHeader,
      viewHeaderClassName: state.viewHeaderClassName,
    })
  );

  return (
    <div
      className={cn(
        // Full width of the shared grid column so the hour labels divide the
        // same space as the body columns; a `w-fit` header computed its own
        // width and drifted a pixel per column from the grid lines.
        "flex h-12 w-full",
        stickyViewHeader && "bg-background sticky top-0 z-21",
        className,
        viewHeaderClassName
      )}
      data-testid="horizontal-grid-header"
    >
      {children}
    </div>
  );
};

export const HorizontalGridHeaderContainer = memo(
  NoMemoHorizontalGridHeaderContainer
);
