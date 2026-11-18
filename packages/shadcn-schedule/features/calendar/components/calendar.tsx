import type React from "react";
import { useMemo } from "react";

import { AnimatedSection } from "@/components/animations/animated-section";
import { CalendarDndContext } from "@/components/drag-and-drop/calendar-dnd-context";
import { EventFormDialog } from "@/features/calendar/components/event-form/event-form-dialog";
import { Header } from "@/features/calendar/components/header/base-header";
import { ViewRenderer } from "@/features/calendar/components/views/view-renderer";
import { CalendarProvider } from "@/features/calendar/contexts/calendar-context/provider";
import { useSmartCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { useSwipeNavigation } from "@/features/calendar/hooks/use-swipe-navigation";
import type {
  CalendarPropEvent,
  CalendarProps,
} from "@/features/calendar/types/index";
import { cn } from "@/lib/cn";
import {
  EVENT_BAR_HEIGHT,
  GAP_BETWEEN_ELEMENTS,
  WEEK_DAYS_NUMBER_MAP,
} from "@/lib/constants";
import { normalizeEvents, toHiddenDaysSet } from "@/lib/utils/normalize";
import {
  hasWidthClass,
  normalizeResourceWidth,
} from "@/lib/utils/resource-width";
import type { CalendarEvent, TimeFormat } from "@/types/index";
import { safeDate } from "@/utils/helpers";

const CalendarContent: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className, style }) => {
  const {
    view,
    getViews,
    nextPeriod,
    prevPeriod,
    enableSwipeNavigation,
    resourceColumnWidth,
    resourceWidth,
  } = useSmartCalendarContext((c) => ({
    enableSwipeNavigation: c.enableSwipeNavigation,
    getViews: c.getViews,
    nextPeriod: c.nextPeriod,
    prevPeriod: c.prevPeriod,
    resourceColumnWidth: c.resourceColumnWidth,
    resourceWidth: c.resourceWidth,
    view: c.view,
  }));

  const swipeHandlers = useSwipeNavigation({
    enabled: enableSwipeNavigation,
    onSwipeLeft: nextPeriod,
    onSwipeRight: prevPeriod,
  });

  const customWidth = resourceColumnWidth ?? resourceWidth;
  const normalizedWidth = normalizeResourceWidth(customWidth);

  const cssVarStyle:
    | (React.CSSProperties & Record<string, string | number>)
    | undefined =
    normalizedWidth !== undefined && !hasWidthClass(normalizedWidth)
      ? { "--schedule-resource-width": normalizedWidth }
      : undefined;

  const combinedStyle: React.CSSProperties = { ...cssVarStyle, ...style };

  const spec = getViews().find((v) => v.name === view);
  const activeView = spec ? <ViewRenderer key={view} view={spec} /> : null;

  return (
    <div
      className={cn("flex h-full w-full flex-col", className)}
      data-testid="calendar"
      style={combinedStyle}
    >
      <Header className="mb-1 shrink-0 p-1" />
      {/* Calendar Body with AnimatePresence for view transitions */}
      <CalendarDndContext>
        <AnimatedSection
          className="min-h-0 w-full flex-1"
          direction="horizontal"
          transitionKey={view}
        >
          {/* `data-calendar-viewport` is a stable hook for plugins (e.g.
					    drag-to-create clips its selection overlay to this box). Keep it
					    even if the test id changes. */}
          <div
            className="h-full w-full touch-pan-y border"
            data-calendar-viewport="true"
            data-testid="calendar-body"
            {...swipeHandlers}
          >
            {activeView}
          </div>
        </AnimatedSection>
      </CalendarDndContext>
      <EventFormDialog />
    </div>
  );
};

interface TimeFormatOptions {
  hour12?: boolean;
  timeFormat?: TimeFormat;
}

const normalizeTimeFormat = ({
  hour12,
  timeFormat,
}: TimeFormatOptions): "12-hour" | "24-hour" => {
  if (hour12 !== undefined) {
    return hour12 ? "12-hour" : "24-hour";
  }

  if (timeFormat === "24h" || timeFormat === "24-hour") {
    return "24-hour";
  }

  return "12-hour";
};

export const Calendar = <TMeta = unknown,>({
  events,
  firstDayOfWeek = "sunday",
  initialView = "month",
  initialDate,
  eventSpacing = GAP_BETWEEN_ELEMENTS,
  eventHeight = EVENT_BAR_HEIGHT,
  stickyViewHeader = true,
  viewHeaderClassName = "",
  timeFormat = "12-hour",
  hour12,
  hideNonBusinessHours = false,
  hiddenDays,
  resources,
  orientation,
  resourceColumnWidth,
  resourceWidth,
  className,
  style,
  ...props
}: CalendarProps<TMeta>): React.ReactElement => {
  // Stable reference while `events` is unchanged. Without this, a fresh array on
  // every render makes CalendarProvider re-sync (use-calendar-data) and discard
  // in-memory edits (recurring overrides/EXDATEs, drags) on any re-render (#197).
  const normalizedEvents = useMemo(
    () =>
      normalizeEvents<CalendarPropEvent<TMeta>, CalendarEvent<TMeta>>(events),
    [events]
  );

  const resolvedTimeFormat = normalizeTimeFormat({ hour12, timeFormat });

  return (
    <CalendarProvider<TMeta>
      className={className}
      eventHeight={eventHeight}
      eventSpacing={eventSpacing}
      events={normalizedEvents}
      firstDayOfWeek={WEEK_DAYS_NUMBER_MAP[firstDayOfWeek]}
      hiddenDays={toHiddenDaysSet(hiddenDays)}
      hideNonBusinessHours={hideNonBusinessHours}
      initialDate={safeDate(initialDate)}
      initialView={initialView}
      orientation={orientation}
      resourceColumnWidth={resourceColumnWidth}
      resourceWidth={resourceWidth}
      resources={resources}
      stickyViewHeader={stickyViewHeader}
      style={style}
      timeFormat={resolvedTimeFormat}
      viewHeaderClassName={viewHeaderClassName}
      {...props}
    >
      <CalendarContent className={className} style={style} />
    </CalendarProvider>
  );
};
