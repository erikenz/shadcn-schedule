import { memo } from "react";
import type { Temporal } from "temporal-polyfill";

import { CurrentTimeMarker } from "@/components/current-time-marker";
import { DraggableEvent } from "@/components/draggable-event/draggable-event";
import { useProcessedDayEvents } from "@/features/calendar/hooks/use-processed-day-events";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { cn } from "@/lib/cn";
import { hasRef } from "@/lib/guards";
import { keys } from "@/lib/utils/keys";
import type { Resource } from "@/types/index";
import { diff, toISOString } from "@/utils/temporal";

interface VerticalGridEventsLayerProps {
  "data-testid"?: string;
  // The specific day this layer represents
  days: Temporal.ZonedDateTime[];
  gridType?: "day" | "hour";
  resource?: Resource;
  resourceId?: string | number;
}

const NoMemoVerticalGridEventsLayer: React.FC<VerticalGridEventsLayerProps> = ({
  days,
  gridType = "hour",
  resourceId,
  resource,
  "data-testid": dataTestId,
}) => {
  const { resources } = useSmartCalendarContext((c) => ({
    resources: c.resources,
  }));

  const todayEvents = useProcessedDayEvents({ days, gridType, resourceId });
  const rangeStart = days.at(0);
  const firstDay = days.at(0);

  const rangeEnd = days
    .at(-1)
    ?.add(gridType === "hour" ? { hours: 1 } : { days: 1 });

  // Stacked resource rows share one continuous now-line; only the first resource
  // (or a non-resource grid) draws the dot at its start, so it isn't repeated.
  const isFirstResource =
    !hasRef(resourceId) || resources?.at(0)?.id === resourceId;

  // Only show the "now" line in hour-resolution grids. In day-resolution
  // vertical views (resource month, resource week daily) a sub-day percentage
  // line is meaningless, so suppress it — mirrors the horizontal events layer.
  const showNowLine = gridType === "hour" && Boolean(rangeStart && rangeEnd);

  return (
    <div
      className="pointer-events-none relative z-10 h-full w-full overflow-clip"
      data-testid={dataTestId}
    >
      {todayEvents.map((positioned, index) => {
        const { event } = positioned;
        const eventKey = `event-${event.id}-${index}-${firstDay ? toISOString(firstDay) : ""}-${resourceId ?? "no-resource"}`;
        const isShortEvent = diff(event.end, event.start, "minute") <= 15;

        const isTruncatedStart = rangeStart
          ? diff(event.start, rangeStart, "second") < 0
          : false;

        const isTruncatedEnd = rangeEnd
          ? diff(event.end, rangeEnd, "second") > 0
          : false;

        return (
          <div
            className="absolute"
            key={keys.listKey(eventKey, "wrapper")}
            style={{
              height: `${positioned.height}%`,
              left: `${positioned.left}%`,
              top: `${positioned.top}%`,
              width: `${positioned.width}%`,
            }}
          >
            <DraggableEvent
              className={cn("pointer-events-auto", {
                "[&_p]:mt-0 [&_p]:text-[10px]": isShortEvent,
              })}
              elementId={eventKey}
              event={event}
              isTruncatedEnd={isTruncatedEnd}
              isTruncatedStart={isTruncatedStart}
            />
          </div>
        );
      })}
      {showNowLine && rangeStart && rangeEnd ? (
        <CurrentTimeMarker
          rangeEnd={rangeEnd}
          rangeStart={rangeStart}
          resource={resource}
          withDot={isFirstResource}
        />
      ) : null}
    </div>
  );
};

export const VerticalGridEventsLayer = memo(NoMemoVerticalGridEventsLayer);
