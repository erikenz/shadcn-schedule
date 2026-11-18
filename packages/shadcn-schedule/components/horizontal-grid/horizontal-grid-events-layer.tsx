import { memo } from "react";
import type { Temporal } from "temporal-polyfill";

import { CurrentTimeMarker } from "@/components/current-time-marker";
import { DraggableEvent } from "@/components/draggable-event/draggable-event";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { DAY_NUMBER_HEIGHT, HORIZONTAL_EVENT_INSET } from "@/lib/constants";
import { hasNumber, hasRef } from "@/lib/guards";
import type { HorizontalPositionedEvent } from "@/lib/layout/geometry";
import { keys } from "@/lib/utils/keys";
import type { Resource } from "@/types/index";
import { startOf, toISOString } from "@/utils/temporal";

interface HorizontalGridEventsLayerProps {
  "data-testid"?: string;
  /** Pixel offset reserved above the bars (the day-number strip). */
  dayNumberHeight?: number;
  days: Temporal.ZonedDateTime[];
  gridType?: "day" | "hour";
  positionedEvents: HorizontalPositionedEvent[];
  resource?: Resource;
  resourceId?: string | number;
}

const NoMemoHorizontalGridEventsLayer: React.FC<
  HorizontalGridEventsLayerProps
> = ({
  gridType = "day",
  days,
  resourceId,
  resource,
  "data-testid": dataTestId,
  positionedEvents,
  dayNumberHeight = DAY_NUMBER_HEIGHT,
}) => {
  const { eventHeight, eventSpacing, resourceRowHeight, resources } =
    useSmartCalendarContext();

  const firstDay = days.at(0);
  const weekStart = firstDay ? startOf(firstDay, "day") : undefined;

  // Stacked resource rows share one continuous now-line; only the first resource
  // (or a non-resource grid) draws the dot at its start, so it isn't repeated.
  const isFirstResource =
    !hasRef(resourceId) || resources?.at(0)?.id === resourceId;

  // Fixed-height rows (hour grids only): stacked events share the row, so
  // each bar occupies one equal slice. The layer spans the row, so
  // percentages resolve against the row height with no pixel plumb-through.
  let lastRow = 0;

  for (const event of positionedEvents) {
    lastRow = Math.max(lastRow, event.row);
  }

  const stackCount =
    hasNumber(resourceRowHeight) && gridType === "hour"
      ? Math.max(1, lastRow + 1)
      : undefined;

  // Now-line is gated to hour-resolution horizontal grids (resource day horizontal,
  // resource week horizontal hourly). Day-resolution grids — regular MonthView and
  // resource MonthView — skip it; a 24h-percentage line per cell would be a
  // meaningless 1px sliver.
  const rangeStart = days.at(0);

  const rangeEnd = days
    .at(-1)
    ?.add(gridType === "hour" ? { hours: 1 } : { days: 1 });

  const showNowLine = gridType === "hour" && Boolean(rangeStart && rangeEnd);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-clip"
      data-testid={dataTestId}
    >
      {showNowLine && rangeStart && rangeEnd ? (
        <CurrentTimeMarker
          axis="horizontal"
          rangeEnd={rangeEnd}
          rangeStart={rangeStart}
          resource={resource}
          withDot={isFirstResource}
        />
      ) : null}
      {positionedEvents.map((positioned) => {
        const { event, row } = positioned;

        // Fixed-height rows: bars fill their share of the row. Otherwise the
        // layout returns the abstract row and the renderer owns the CSS units.
        const top = hasNumber(stackCount)
          ? `calc(${(row * 100) / stackCount}% + ${HORIZONTAL_EVENT_INSET}px)`
          : dayNumberHeight + eventSpacing + row * (eventHeight + eventSpacing);

        const height = hasNumber(stackCount)
          ? `calc(${100 / stackCount}% - ${HORIZONTAL_EVENT_INSET * 2}px)`
          : `${eventHeight}px`;

        const eventKey = `${event.id}-${row}-${weekStart ? toISOString(weekStart) : ""}-${resourceId ?? "no-resource"}`;

        return (
          <div
            className="pointer-events-auto absolute z-10 overflow-clip"
            data-left={positioned.left}
            data-testid={keys.container.horizontal.event(event.id)}
            data-top={top}
            data-width={positioned.width}
            key={keys.listKey(eventKey, "wrapper")}
            style={{
              height,
              top,
              left: `calc(${positioned.left}% + var(--spacing) * 0.25)`,
              width: `calc(${positioned.width}% - var(--spacing) * 1)`,
            }}
          >
            <DraggableEvent
              className="h-full w-full shadow"
              elementId={eventKey}
              event={event}
              isTruncatedEnd={positioned.isTruncatedEnd}
              isTruncatedStart={positioned.isTruncatedStart}
            />
          </div>
        );
      })}
    </div>
  );
};

export const HorizontalGridEventsLayer = memo(NoMemoHorizontalGridEventsLayer);
