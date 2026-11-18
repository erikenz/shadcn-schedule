import { memo } from "react";
import type { Temporal } from "temporal-polyfill";

import { AllDayCell } from "@/components/all-day-row/all-day-cell";
import { HorizontalGridRow } from "@/components/horizontal-grid/horizontal-grid-row";
import { cn } from "@/lib/cn";
import { keys } from "@/lib/utils/keys";
import type { Resource } from "@/types/index";

interface AllDayRowProps {
  classes?: { row?: string; cell?: string; spacer?: string };
  days: Temporal.ZonedDateTime[];
  resource?: Resource;
  showSpacer?: boolean;
}

const NoMemoAllDayRow: React.FC<AllDayRowProps> = ({
  days,
  classes,
  resource,
  showSpacer = true,
}) => {
  const columns = days.map((day, index) => ({
    day,
    className: cn("bg-background h-full min-h-12", classes?.cell),
    gridType: "day" as const,
    id: keys.col.allDay(day, index),
  }));

  return (
    <div
      // gap-px + bg-border draws the spacer/grid + inter-day separators,
      // matching the header and body. The bottom border is owned by the
      // all-day container in VerticalGridHeaderContainer.
      className={cn("bg-border flex w-full gap-px", classes?.row)}
      data-testid="all-day-row"
    >
      {/* Time col spacer */}
      {showSpacer ? <AllDayCell className={classes?.spacer} /> : null}

      <HorizontalGridRow
        allDay
        className="min-h-fit flex-1"
        columns={columns}
        dayNumberHeight={0}
        gridType="day"
        id={keys.allDayRow(resource?.id)}
        resource={resource}
        variant="regular"
      />
    </div>
  );
};

export const AllDayRow = memo(NoMemoAllDayRow);
