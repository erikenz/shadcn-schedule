import type React from "react";
import type { Temporal } from "temporal-polyfill";

import type { EventFormProps } from "@/features/calendar/components/event-form/event-form";
import type {
  Translations,
  TranslatorFunction,
} from "@/lib/translations/types";
import type {
  BusinessHours,
  CalendarEvent,
  CalendarPlugin,
  CalendarView,
  PluginView,
  Resource,
  TimeFormat,
  WeekDays,
} from "@/types/index";

/**
 * Granularity of the time grid in minutes for day, week, and resource hour views.
 * Quarter-hour increments only. `60` shows one row per hour with no sub-hour lines.
 * `30` shows two rows per hour. `15` shows four rows per hour with dashed sub-hour separators.
 */
export type SlotDuration = 15 | 30 | 60;

/**
 * Custom class names for calendar styling.
 * Allows users to override default styles for various calendar elements.
 */
export interface CalendarClassesOverride {
  /**
   * Class name for disabled cells (non-business hours).
   * Replaces the DISABLED_CELL_CLASSNAME constant.
   * @default "bg-secondary text-muted-foreground pointer-events-none"
   * @example "bg-gray-100 text-gray-400 cursor-not-allowed"
   */
  disabledCell?: string;
  /**
   * Class name for resource row label cells in horizontal views.
   * Merged with default resource row label styling.
   * @example "w-24 min-w-24"
   */
  resourceLabel?: string;
  /**
   * Class name for the top-left resource corner cell in horizontal views.
   * Merged with default resource corner cell styling.
   * @example "w-24 min-w-24"
   */
  resourceCorner?: string;
  /**
   * Alias / class name for resource header elements (e.g. corner cell).
   * @example "w-24 min-w-24"
   */
  resourceHeader?: string;
}

/** A date accepted from consumers; converted to `Temporal.ZonedDateTime` internally. */
export type CalendarEventDate = Temporal.ZonedDateTime | Date | string;

/**
 * This interface extends the base CalendarEvent but allows more flexible date types
 * for the start and end properties. The component will automatically convert these
 * to ZonedDateTimes internally for consistent date handling.
 *
 * @augments {Omit<CalendarEvent, 'start' | 'end'>}
 */
export interface CalendarPropEvent<TMeta = unknown> extends Omit<
  CalendarEvent<TMeta>,
  "start" | "end"
> {
  end: CalendarEventDate;
  start: CalendarEventDate;
}

/**
 * Information passed to the onCellClick callback.
 * Uses named properties for extensibility.
 */
export interface DateRange {
  end: Temporal.ZonedDateTime;
  start: Temporal.ZonedDateTime;
}

export interface CellInfo {
  /** Whether this is an all-day cell (optional) */
  allDay?: boolean;
  /** End date/time of the cell */
  end: Temporal.ZonedDateTime;
  /** Full resource object in resource calendars; undefined in a regular calendar */
  resource?: Resource;
  /** Start date/time of the cell */
  start: Temporal.ZonedDateTime;
}

/**
 * Input accepted by `openEventForm`. A partial event, optionally carrying the
 * full resource of the clicked cell (`CellInfo` is assignable as-is). When no
 * explicit `resourceId` is given, the carried resource's id is used.
 */
export type OpenEventFormInput = Partial<CalendarEvent> & {
  resource?: Resource;
};

/**
 * Props passed to the custom render function for the current time indicator.
 * Allows users to customize how the current time indicator is displayed.
 */
export interface RenderCurrentTimeIndicatorProps {
  /**
   * Layout axis the indicator is rendered along.
   * - `'vertical'`: `progress` maps to a `top` offset (day/week vertical grids).
   * - `'horizontal'`: `progress` maps to a `left` offset (horizontal resource hour grids).
   *
   * The library always populates this field, so consumers can treat it as
   * always defined inside their render function.
   *
   * Note: distinct from the `orientation` prop on `Calendar`.
   * `orientation` chooses which view component renders the calendar; `axis` tells
   * your render function which dimension `progress` maps to inside that view.
   */
  axis?: "vertical" | "horizontal";
  /** The current time as a Temporal.ZonedDateTime */
  currentTime: Temporal.ZonedDateTime;
  /** Progress percentage (0-100) representing position in the range */
  progress: number;
  /** The end of the visible time range */
  rangeEnd: Temporal.ZonedDateTime;
  /** The start of the visible time range */
  rangeStart: Temporal.ZonedDateTime;
  /**
   * The resource associated with this column (if in a resource-based view).
   * Pass this to conditionally render custom indicators for specific resources.
   */
  resource?: Resource;
  /** The current calendar view (e.g. 'day', 'week') */
  view: CalendarView;
}

/**
 * Custom pluggable components to replace built-in calendar parts.
 */
export interface CalendarComponents {
  /**
   * Custom event form component to replace the default EventFormDialog.
   * Pass a React component, or `null` / `false` to disable the built-in form
   * (e.g. when mounting your own external form or drawer).
   */
  EventForm?: React.ComponentType<EventFormProps> | null | false;
}

/**
 * Information about which slice of an event a bar represents.
 * When an event spans across multiple rows/weeks, it is drawn as multiple segments.
 */
export interface EventSegment {
  /** Whether this segment includes the actual start of the event. */
  isStart: boolean;
  /** Whether this segment includes the actual end of the event. */
  isEnd: boolean;
}

export interface CalendarProps<TMeta = unknown> {
  /**
   * Additional CSS classes for the root calendar element.
   */
  className?: string;
  /**
   * Additional inline styles for the root calendar element.
   * Useful for setting CSS variables such as `--schedule-resource-width`.
   * @example { "--schedule-resource-width": "3rem" }
   */
  style?: React.CSSProperties & Record<string, string | number>;
  /**
   * Custom pluggable components (e.g. `EventForm`).
   */
  components?: CalendarComponents;
  /**
   * Configuration for business hours.
   * Defines the working hours to be highlighted on the calendar.
   * Can be a single BusinessHours object (applies to all specified days)
   * or an array of BusinessHours objects (for different hours on different days).
   */
  businessHours?: BusinessHours | BusinessHours[];
  /**
   * Custom class names for overriding default calendar element styles.
   * Allows fine-grained control over the appearance of different calendar elements.
   * @example { disabledCell: "bg-gray-100 text-gray-400" }
   */
  classesOverride?: CalendarClassesOverride;
  /**
   * Maximum number of events to display per day in month view.
   * Additional events will be hidden and can be viewed via a "more" link.
   * Defaults to 3 if not specified.
   */
  dayMaxEvents?: number;
  /**
   * Whether to disable click events on calendar cells.
   * Useful for read-only views or when cell clicks are not needed.
   */
  disableCellClick?: boolean;
  /**
   * Whether to disable drag-and-drop functionality for calendar events.
   * Useful for read-only views or when drag-and-drop is not needed.
   */
  disableDragAndDrop?: boolean;
  /**
   * Whether to disable click events on calendar events.
   * Useful for read-only views or when event clicks are not needed.
   */
  disableEventClick?: boolean;
  /**
   * Whether horizontal swipe gestures navigate between calendar periods (days/weeks/months).
   * Swiping left moves to the next period, swiping right moves to the previous period.
   * @default true
   */
  enableSwipeNavigation?: boolean;
  /**
   * Height of event bars in horizontal grid views (month view, resource month, resource week horizontal) in pixels.
   * Increase this to show more content per event (e.g., title + time on separate lines).
   * Does not affect day/week views, which use percentage-based heights that scale with event duration.
   * Defaults to 24 pixels if not specified.
   */
  eventHeight?: number;
  /**
   * How overlapping events in the same time slot are arranged.
   * - `false` (default): each event gets its own non-overlapping column.
   * - `true`: events stack full-width on top of each other (later events render above).
   */
  eventOverlap?: boolean;
  /**
   * Vertical spacing between stacked events in pixels.
   * Controls the gap between events when multiple events are displayed in the same view.
   * Defaults to 1 pixel if not specified.
   * Recommended range: 1-8 pixels for optimal readability.
   */
  eventSpacing?: number;
  /**
   * Array of events to display in the calendar.
   */
  events?: CalendarPropEvent<TMeta>[];
  /**
   * The first day of the week to display in the calendar.
   * Can be 'sunday', 'monday', etc. Defaults to 'sunday'.
   */
  firstDayOfWeek?: WeekDays;
  /**
   * Returns extra CSS classes for a cell based on custom logic (unavailability
   * styling, on-call windows, etc.). Unlike `isCellDisabled`, this is purely
   * visual — cells remain clickable and accept drag-drops.
   */
  getCellClassName?: (info: CellInfo) => string;
  /**
   * Custom class name for the calendar header.
   * Useful for applying custom styles to the header.
   */
  headerClassName?: string;
  /**
   * Custom header component to replace the default calendar header.
   * Useful for adding custom branding or additional controls.
   */
  headerComponent?: React.ReactNode;
  /**
   * Days of the week to hide from the week view.
   * Hidden days won't render as columns, giving remaining days more space.
   *
   * Applies to:
   * - Regular vertical week view (always)
   * - Resource vertical week view in hourly granularity
   *
   * Does NOT apply to:
   * - Resource horizontal week view (layout is days-as-rows)
   * - Resource vertical week view in daily granularity
   *   (`weekViewGranularity: 'daily'`) — non-contiguous visible days would
   *   break multi-day event positioning
   * - Month, day, and year views
   *
   * @default []
   * @example ['saturday', 'sunday'] // Hide weekends
   */
  hiddenDays?: WeekDays[];
  /**
   * Whether to hide the iCalendar export button in the calendar header.
   * Applies to both desktop and mobile header layouts.
   * @default false
   */
  hideExportButton?: boolean;
  /**
   * Whether to hide non-business hours in Day and Week views.
   * Requires businessHours to be configured.
   * @default false
   */
  hideNonBusinessHours?: boolean;
  /**
   * The initial date to display when the calendar loads.
   * If not provided, the calendar will default to today's date.
   */
  initialDate?: Temporal.ZonedDateTime | Date | string;
  /**
   * The initial view to display when the calendar loads.
   * Defaults to 'month'.
   */
  initialView?: CalendarView;
  /**
   * Predicate to disable individual cells based on custom logic (holidays,
   * days-off, past dates, on-call windows, etc.). Return `true` to disable a
   * cell — disabled cells block event creation clicks, reject drag-drops, and
   * are grayed out. Composes with `businessHours` (a cell is disabled if either
   * business hours or this predicate disables it).
   */
  isCellDisabled?: (info: CellInfo) => boolean;
  /**
   * Locale to use for formatting dates and times.
   * If not provided, the default locale will be used.
   */
  locale?: string;
  /**
   * Callback when a calendar cell is clicked.
   * Provides cell information including start/end dates and optional resourceId.
   */
  onCellClick?: (info: CellInfo) => void;
  /**
   * Callback when the current date changes (navigation).
   * Provides the new current date and the current visible range.
   */
  onDateChange?: (date: Temporal.ZonedDateTime, range: DateRange) => void;
  /**
   * Callback when a new event is added to the calendar.
   * Provides the newly created event object.
   */
  onEventAdd?: (event: CalendarEvent<TMeta>) => void;
  /**
   * Callback when an event is clicked.
   * Provides the clicked event object.
   */
  onEventClick?: (
    event: CalendarEvent<TMeta>,
    nativeEvent?: React.MouseEvent
  ) => void;
  /**
   * Callback when an event is deleted from the calendar.
   * Provides the deleted event object.
   */
  onEventDelete?: (event: CalendarEvent<TMeta>) => void;
  /**
   * Callback when an existing event is updated.
   * Provides the updated event object.
   */
  onEventUpdate?: (event: CalendarEvent<TMeta>) => void;
  /**
   * Called when the "+N more" overflow indicator in a month/grid cell is
   * clicked, receiving the cell's day and its full list of events.
   * If provided, it overrides the built-in "all events" dialog, letting you
   * render your own popover/dialog. When omitted, the default dialog opens.
   */
  onMoreEventsClick?: (
    day: Temporal.ZonedDateTime,
    events: CalendarEvent<TMeta>[]
  ) => void;
  /**
   * Callback when the calendar view changes (month, week, day, year).
   * Useful for syncing with external state or analytics.
   */
  onViewChange?: (view: CalendarView) => void;
  /**
   * How resources are arranged. Only applies when `resources` is set.
   * - "horizontal": resources are rows, time is columns (default)
   * - "vertical": resources are columns, time is rows
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Optional plugins that add behavior/UI (e.g. recurrence). The core ships
   * with no plugins by default — pass `recurrencePlugin()` to enable recurring
   * events.
   */
  plugins?: CalendarPlugin<TMeta>[];
  /**
   * Custom render function for the current time indicator.
   * If provided, replaces the default red line indicator.
   * Useful for adding custom time labels or styling.
   *
   * Branch on `axis` to position correctly across vertical day/week grids
   * (`axis === 'vertical'` → use `top`) and horizontal resource hour grids
   * (`axis === 'horizontal'` → use `left`).
   *
   * @example
   * ```tsx
   * renderCurrentTimeIndicator={({ currentTime, progress, resource, view, axis }) => {
   *   // Only show the time badge for the first resource in Day view (to avoid repetition)
   *   const isPrimary = !resource || resource.id === 'room-a'
   *   const showBadge = view === 'day' ? isPrimary : true
   *
   *   if (axis === 'horizontal') {
   *     return (
   *       <div style={{ left: `${progress}%` }} className="absolute top-0 bottom-0">
   *         <div className="w-0.5 h-full bg-red-500" />
   *       </div>
   *     )
   *   }
   *
   *   return (
   *     <div style={{ top: `${progress}%` }} className="absolute left-0 right-0">
   *       <div className="h-0.5 bg-red-500" />
   *       {showBadge && (
   *         <span className="absolute left-0 bg-red-500 text-white text-[10px] px-1 rounded-r-sm">
   *           {format(currentTime, 'h:mm A')}
   *         </span>
   *       )}
   *     </div>
   *   )
   * }}
   * ```
   */
  renderCurrentTimeIndicator?: (
    props: RenderCurrentTimeIndicatorProps
  ) => React.ReactNode;
  /**
   * Custom render function for calendar events.
   * If provided, it will override the default event rendering.
   * Receives the event and segment slice info (`isStart` / `isEnd`).
   */
  renderEvent?: (
    event: CalendarEvent<TMeta>,
    segment: EventSegment
  ) => React.ReactNode;
  /**
   * Custom render function for the event form.
   * If provided, it will override the default event form component.
   * The function receives EventFormProps and should return a React node.
   */
  renderEventForm?: (props: EventFormProps) => React.ReactNode;
  /**
   * Custom render function for the hour labels in the gutter/header.
   * Receives a Temporal.ZonedDateTime object for the hour and should return a React node.
   */
  renderHour?: (date: Temporal.ZonedDateTime) => React.ReactNode;
  /** Custom render function for resource header cells. */
  renderResource?: (resource: Resource) => React.ReactNode;
  /**
   * Fixed height in pixels for each resource row in horizontal hour-grids
   * (e.g. resource day view with `orientation="horizontal"`). When set, rows
   * keep this height regardless of how many events a resource has, the hour
   * cells skip their event-count placeholders, and event bars fill the row
   * (stacked events share it). Absent → rows size to
   * `dayMaxEvents` x `eventHeight` as usual.
   */
  resourceRowHeight?: number;
  /**
   * Custom width for the resource column in horizontal views.
   * Can be a CSS length (e.g. '3rem', '120px'), a pixel number (e.g. 120), or a Tailwind width class (e.g. 'w-24').
   * Setting this keeps the corner header cell and resource row cells aligned.
   * You can also configure this via CSS variable `--schedule-resource-width` on the calendar or parent element.
   * @example "3rem"
   * @example 120
   * @example "w-24"
   */
  resourceColumnWidth?: string | number;
  /**
   * Alias for `resourceColumnWidth`.
   */
  resourceWidth?: string | number;
  /**
   * Resources (people, rooms, equipment) to display as a resource axis.
   * When set: events are shown per matching resource (`resourceIds`, falling
   * back to `resourceId`); events with no resource assignment are hidden; the
   * year view is hidden from the view switcher.
   */
  resources?: Resource[];
  /**
   * Initial scroll position for hour-resolution views (day, week, resource
   * day, resource week, in both orientations). Accepts `"HH:mm"` or
   * `"HH:mm:ss"`. Minutes are floored to the hour. The scroll target is
   * clamped to the nearest visible row when `hideNonBusinessHours` hides
   * the requested hour.
   *
   * Independent of `businessHours`: you can show all 24 hours and still
   * focus on 08:00 on load.
   *
   * **Requires a fixed calendar height** so the internal time grid has a
   * scroll container to scroll within. If the calendar host element has
   * `height: auto`, the time grid grows to fit all hours and there is
   * nothing to scroll — this prop becomes a silent no-op.
   *
   * @example
   * ```tsx
   * <Calendar
   *   businessHours={{ daysOfWeek: [1,2,3,4,5], startTime: 0, endTime: 24 }}
   *   scrollTime="08:00:00"
   * />
   * ```
   */
  scrollTime?: string;
  /**
   * Granularity of the time grid in minutes for day, week, and resource hour views.
   * Quarter-hour increments only: `15`, `30`, or `60`.
   *
   * - `60` (default): one row per hour, no sub-hour lines.
   * - `30`: two rows per hour (top of hour, half hour).
   * - `15`: four rows per hour with dashed sub-hour separators.
   *
   * @default 60
   */
  slotDuration?: SlotDuration;
  /**
   * Whether to stick the view header to the top of the calendar.
   * Useful for keeping the header visible while scrolling.
   */
  stickyViewHeader?: boolean;
  /**
   * Time format for displaying times in the calendar.
   * - "12-hour" or "12h": Times displayed as "1:00 PM" (default)
   * - "24-hour" or "24h": Times displayed as "13:00"
   */
  timeFormat?: TimeFormat;
  /**
   * Shorthand boolean to toggle 12-hour (`true`) vs 24-hour (`false`) format.
   * Overrides `timeFormat` when specified.
   */
  hour12?: boolean;
  /**
   * Timezone to use for displaying dates and times.
   * If not provided, the local timezone will be used.
   */
  timezone?: string;
  /**
   * Translations object for internationalization.
   * Provide either this OR translator function, not both.
   */
  translations?: Translations;
  /**
   * Translator function for internationalization.
   * Provide either this OR translations object, not both.
   */
  translator?: TranslatorFunction;
  /**
   * Custom class name for the view header.
   * Useful for applying custom styles or themes.
   */
  viewHeaderClassName?: string;
  /**
   * Custom view list for the view switcher, replacing the built-in views
   * (day/week/month/year). Compose from the exported default view specs
   * (dayView, weekView, monthView, yearView) or pass fully custom
   * PluginView objects. Defaults to all built-in views. Plugin views
   * registered via `plugins` are always included.
   */
  views?: PluginView[];
  /**
   * Granularity of week-view time slots when `resources` is set.
   * - "hourly": one column per hour (default)
   * - "daily": one column per day. Note: `hiddenDays` is ignored in daily
   *   mode (non-contiguous days would break multi-day event positioning).
   */
  weekViewGranularity?: "hourly" | "daily";
}
