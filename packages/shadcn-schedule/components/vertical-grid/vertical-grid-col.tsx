import type React from "react";
import { memo } from "react";

import { GridCell } from "@/components/grid-cell";
import { VerticalGridEventsLayer } from "@/components/vertical-grid/vertical-grid-events-layer";
import { cn } from "@/lib/cn";
import { textOr } from "@/lib/guards";
import { keys } from "@/lib/utils/keys";
import type { VerticalColumnSpec } from "@/types/index";
import { format } from "@/utils/temporal";

export interface VerticalGridColProps extends VerticalColumnSpec {
  "data-testid"?: string;
  /**
   * Granularity of each hour row in minutes. `60` renders one cell per hour with
   * no sub-hour lines. `30` renders two. `15` renders four with dashed separators.
   */
  slotDurationMinutes?: number;
}

const NoMemoVerticalGridCol: React.FC<VerticalGridColProps> = ({
  id,
  days,
  resource,
  "data-testid": dataTestId,
  gridType,
  className,
  renderCell,
  noEvents,
  slotDurationMinutes = 60,
}) => {
  // The spec carries `resource` as the single source; derive the id here.
  const resourceId = resource?.id;
  const slotCount = Math.floor(60 / slotDurationMinutes);

  const cellOffsets = Array.from(
    { length: slotCount },
    (_, i) => i * slotDurationMinutes
  );

  const hasSubHourSlots = cellOffsets.length > 1;

  return (
    <div
      className={cn(
        // Opaque column; grid lines come from the gaps in the containers
        // (this one for vertical separators between columns is the parent's job).
        "bg-background relative flex flex-col items-center justify-center",
        noEvents !== true && "min-w-0 flex-1",
        className
      )}
      data-testid={textOr(dataTestId, keys.container.vertical.col(id))}
    >
      {/* Time slots. gap-px + bg-border draws the hour lines through the gaps. */}
      <div
        className="bg-border relative grid h-full w-full gap-px"
        style={{
          gridTemplateRows: `repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        {days.map((day, dayIndex) => {
          const hourStr = format(day, "HH");

          if (renderCell) {
            const isTimeGutter = id === keys.col.time;

            const testId = isTimeGutter
              ? keys.cell.verticalTime(hourStr)
              : keys.cell.vertical(day, hourStr, "00", resourceId);

            return (
              <div
                className="bg-background min-h-[60px]"
                data-hour={isTimeGutter ? hourStr : undefined}
                data-testid={testId}
                key={keys.listKey(id, dayIndex, hourStr)}
              >
                {renderCell(day)}
              </div>
            );
          }

          return (
            <div
              className="flex min-h-[60px] flex-col"
              key={keys.listKey(id, dayIndex, hourStr)}
            >
              {cellOffsets.map((minute, offsetIndex) => {
                const mm = String(minute).padStart(2, "0");
                const testId = keys.cell.vertical(day, hourStr, mm, resourceId);

                // Sub-hour slots keep a dashed divider (the documented gap
                // exception) between sub-slots within an hour; the solid hour
                // lines come from the grid's gap-px.
                const isSubDivider =
                  hasSubHourSlots && offsetIndex < cellOffsets.length - 1;

                return (
                  // Events are rendered in a separate layer
                  <GridCell
                    className={cn(
                      "hover:bg-accent relative z-10 min-h-0 flex-1 cursor-pointer",
                      isSubDivider && "border-b border-dashed"
                    )}
                    data-testid={testId}
                    day={hasSubHourSlots ? day.with({ minute }) : day}
                    gridType={gridType}
                    // Match the horizontal grid: a daily cell describes the
                    // whole day (hour undefined); an hourly cell its slot.
                    // Passing the hour for daily cells made them 00:00-01:00
                    // slots, breaking drag-to-create's cross-day selection.
                    hour={gridType === "hour" ? day.hour : undefined}
                    key={keys.listKey(id, dayIndex, mm)}
                    minute={hasSubHourSlots ? minute : undefined}
                    resourceId={resourceId}
                    shouldRenderEvents={false}
                    slotDurationMinutes={slotDurationMinutes}
                  />
                );
              })}
            </div>
          );
        })}

        {/* Event blocks layer */}
        {noEvents !== true && (
          <div className="pointer-events-none absolute inset-0 z-10">
            <VerticalGridEventsLayer
              data-testid={keys.container.eventsLayer("vertical", id)}
              days={days}
              gridType={gridType}
              resource={resource}
              resourceId={resourceId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const VerticalGridCol = memo(NoMemoVerticalGridCol);
