import React, { memo, useCallback, useMemo } from "react";
import type { Temporal } from "temporal-polyfill";

import { AllEventDialog } from "@/components/all-events-dialog";
import type { SelectedDayEvents } from "@/components/all-events-dialog";
import { DroppableCell } from "@/components/droppable-cell";
import { DayLabel } from "@/components/ui/day-label";
import { useEffectiveBusinessHours } from "@/features/calendar/hooks/use-effective-business-hours";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import {
  isBusinessDay,
  isBusinessHour,
} from "@/features/calendar/utils/business-hours";
import { cn } from "@/lib/cn";
import {
  eventOverlapsRange,
  filterEventsForResource,
} from "@/lib/events/pipeline";
import { hasNumber, hasRef, textOr } from "@/lib/guards";
import { isToday } from "@/lib/utils/date-utils";
import { keys } from "@/lib/utils/keys";
import type { CalendarEvent } from "@/types/index";
import { endOf, format, monthIndex, startOf } from "@/utils/temporal";

interface GridProps {
  // Flag to indicate if this is an all-day cell
  allDay?: boolean;
  children?: React.ReactNode;
  // Optional className for custom styling
  className?: string;
  "data-testid"?: string;
  day: Temporal.ZonedDateTime;
  dayMaxEvents?: number;
  // Future use for different grid types
  gridType?: "day" | "hour";
  // Optional hour for hour-based grids
  hour?: number;
  // Optional minute for more granular time slots
  minute?: number;
  precomputedEvents?: CalendarEvent[];
  // Optional resource ID for resource-specific day cells
  resourceId?: string | number;
  // Flag to determine if events should be rendered
  shouldRenderEvents?: boolean;
  // Flag to show or hide the day number
  showDayNumber?: boolean;
  // Span of an hour-grid slot, for business-hour containment
  slotDurationMinutes?: number;
}

const computeCellEvents = (
  storeEvents: CalendarEvent[],
  day: Temporal.ZonedDateTime,
  gridType: "day" | "hour",
  allDay: boolean,
  resourceId?: string | number
): CalendarEvent[] => {
  let eventsForDay = storeEvents.filter((e) =>
    eventOverlapsRange(e, startOf(day, gridType), endOf(day, gridType))
  );

  if (allDay) {
    eventsForDay = eventsForDay.filter((e) => e.allDay === true);
  }

  if (hasRef(resourceId)) {
    return filterEventsForResource(eventsForDay, resourceId);
  }

  return eventsForDay;
};

const checkIsBusiness = (
  gridType: "day" | "hour",
  day: Temporal.ZonedDateTime,
  effectiveBusinessHours: ReturnType<typeof useEffectiveBusinessHours>,
  slotDurationMinutes: number
): boolean => {
  if (gridType === "hour") {
    return isBusinessHour({
      businessHours: effectiveBusinessHours,
      date: day,
      durationMinutes: slotDurationMinutes,
      hour: day.hour,
      minute: day.minute,
    });
  }

  return isBusinessDay(day, effectiveBusinessHours);
};

const NoMemoGridCell: React.FC<GridProps> = ({
  day,
  hour,
  minute,
  slotDurationMinutes = 60,
  className = "",
  resourceId,
  gridType = "day",
  shouldRenderEvents = true,
  allDay = false,
  precomputedEvents,
  "data-testid": dataTestId,
  showDayNumber = false,
  children,
}) => {
  const allEventsDialogRef = React.useRef<{
    open: () => void;
    close: () => void;
    setSelectedDayEvents: (dayEvents: SelectedDayEvents) => void;
  }>(null);

  const {
    dayMaxEvents,
    events: storeEvents,
    currentDate,
    t,
    eventSpacing,
    eventHeight,
    resourceRowHeight,
    onMoreEventsClick,
  } = useSmartCalendarContext((c) => ({
    currentDate: c.currentDate,
    dayMaxEvents: c.dayMaxEvents,
    eventHeight: c.eventHeight,
    eventSpacing: c.eventSpacing,
    events: c.events,
    onMoreEventsClick: c.onMoreEventsClick,
    resourceRowHeight: c.resourceRowHeight,
    t: c.t,
  }));

  const effectiveBusinessHours = useEffectiveBusinessHours(resourceId);

  const todayEvents = useMemo(() => {
    if (!shouldRenderEvents) {
      return [];
    }

    if (precomputedEvents) {
      return precomputedEvents;
    }

    return computeCellEvents(storeEvents, day, gridType, allDay, resourceId);
  }, [
    precomputedEvents,
    day,
    resourceId,
    storeEvents,
    gridType,
    shouldRenderEvents,
    allDay,
  ]);

  // Handler for showing all events: defer to the consumer's callback when
  // provided, otherwise open the built-in "all events" dialog.
  const showAllEvents = useCallback(
    (targetDay: Temporal.ZonedDateTime, events: CalendarEvent[]) => {
      if (onMoreEventsClick) {
        onMoreEventsClick(targetDay, events);

        return;
      }

      // React 19 `useRef<T>(null)` keeps `.current` nullable (TS18047); `?.` is required.
      allEventsDialogRef.current?.setSelectedDayEvents({
        day: targetDay,
        events,
      });
      // React 19 `useRef<T>(null)` keeps `.current` nullable (TS18047); `?.` is required.
      allEventsDialogRef.current?.open();
    },
    [onMoreEventsClick]
  );

  const handleShowMoreClick = useCallback(() => {
    showAllEvents(day, todayEvents);
  }, [day, todayEvents, showAllEvents]);

  const isCurrentMonth = monthIndex(day) === monthIndex(currentDate);

  const hiddenEventsCount = todayEvents.length - dayMaxEvents;
  const hasHiddenEvents = hiddenEventsCount > 0;

  // Whole-slot containment: an hour-grid slot is business only if it fits
  // entirely inside business hours, so slots partially crossing a sub-hour
  // boundary (e.g. a 9:00 hour cell with a 9:15 start) count as non-business.
  const isBusiness = useMemo(
    () =>
      checkIsBusiness(
        gridType,
        day,
        effectiveBusinessHours,
        slotDurationMinutes
      ),
    [gridType, day, slotDurationMinutes, effectiveBusinessHours]
  );

  const hourKey = keys.cell.day(day, format(day, "HH"), format(day, "mm"));
  const dayKey = keys.cell.day(day);
  const testId = gridType === "hour" ? hourKey : dayKey;

  const droppableId = keys.droppable.dayCell(day, { allDay, resourceId });

  // Fixed-height hour rows (resourceRowHeight) own their height and render
  // events in the absolutely-positioned events layer, so the event-count
  // placeholders and "+N more" overflow button would only add dead space.
  const fixedRowHeight =
    gridType === "hour" && hasNumber(resourceRowHeight)
      ? resourceRowHeight
      : undefined;

  return (
    <>
      <DroppableCell
        allDay={allDay}
        className={cn(
          "bg-background hover:bg-accent relative min-w-0 cursor-pointer overflow-clip p-1",
          !hasNumber(fixedRowHeight) && "min-h-[60px]",
          className
        )}
        data-testid={textOr(dataTestId, testId)}
        date={day}
        disabled={!(isBusiness && isCurrentMonth)}
        hour={hour}
        id={droppableId}
        minute={minute}
        resourceId={resourceId}
        style={
          hasNumber(fixedRowHeight) ? { minHeight: fixedRowHeight } : undefined
        }
        type={gridType === "hour" && !allDay ? "time-cell" : "day-cell"}
      >
        <div
          className="flex h-full w-full flex-col"
          data-testid="grid-cell-content"
          style={{ gap: `${eventSpacing}px` }}
        >
          {showDayNumber ? (
            <DayLabel
              className="items-start"
              data-testid={keys.dayNumber(day)}
              dayNumber={format(day, "D")}
              today={isToday(day)}
            />
          ) : null}

          {shouldRenderEvents && !hasNumber(fixedRowHeight) ? (
            <>
              {/* Render placeholders for events that occur today so that the cell height is according to dayMaxEvents. */}
              {todayEvents.slice(0, dayMaxEvents).map((event, rowIndex) => (
                <div
                  className="w-full shrink-0"
                  data-testid={event?.title}
                  key={keys.listKey("empty", rowIndex, event.id)}
                  style={{ height: `${eventHeight}px` }}
                />
              ))}

              {/* Show more events button with accurate count. Sits on the
                  cell's inert content layer, so it opts back into pointer
                  events; it is a real <button> (the cell container is a div,
                  not a button). */}
              {hasHiddenEvents && (
                <button
                  className="text-muted-foreground hover:text-foreground pointer-events-auto mt-1 block w-full shrink-0 cursor-pointer text-left text-[10px] whitespace-nowrap sm:text-xs"
                  onClick={handleShowMoreClick}
                  type="button"
                >
                  +{hiddenEventsCount} {t("more")}
                </button>
              )}
            </>
          ) : null}
          {children}
        </div>
      </DroppableCell>

      {/* Dialog for showing all events */}
      <AllEventDialog ref={allEventsDialogRef} />
    </>
  );
};

export const GridCell = memo(NoMemoGridCell);
