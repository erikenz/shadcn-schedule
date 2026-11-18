import type React from "react";
import { useContext } from "react";
import type { Temporal } from "temporal-polyfill";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type {
  CalendarState,
  CalendarStore,
} from "@/features/calendar/store/calendar-store";
import {
  CalendarStoreContext,
  isCalendarStore,
} from "@/features/calendar/store/calendar-store-context";
import type {
  DateRange,
  OpenEventFormInput,
  RenderCurrentTimeIndicatorProps,
} from "@/features/calendar/types/index";
import type { TranslatorFunction } from "@/lib/translations/types";
import type {
  BusinessHours,
  CalendarEvent,
  CalendarPlugin,
  CalendarView,
  PluginSlotContext,
  PluginView,
  Resource,
  TimeFormat,
} from "@/types/index";

// Module constant, not a per-call `|| []`: keeps the public API's `resources`
// identity stable on calendars without a resource axis.
const EMPTY_RESOURCES: Resource[] = [];

/**
 * Full internal context type used by library components.
 */
type SmartCalendarContextType<TMeta = unknown> = CalendarState<TMeta>;

/**
 * The public calendar API surface exposed by useCalendarContext() — for consumers and plugin
 * components. The full internal context is intentionally not exported.
 */
export interface CalendarApi<TMeta = unknown> {
  readonly addEvent: (event: CalendarEvent<TMeta>) => void;
  readonly applyScopedDelete: (
    event: CalendarEvent<TMeta>,
    scope: string
  ) => void;
  readonly applyScopedEdit: (
    event: CalendarEvent<TMeta>,
    updates: Partial<CalendarEvent<TMeta>>,
    scope: string
  ) => void;
  readonly businessHours?: BusinessHours | BusinessHours[];
  readonly closeEventForm: () => void;
  readonly collect: (point: string, context: CalendarEvent) => unknown[];
  readonly currentDate: Temporal.ZonedDateTime;
  readonly currentLocale: string;
  /** The active view's current visible date range (what is on screen). */
  readonly currentRange: DateRange;
  readonly deleteEvent: (eventId: string | number) => void;
  readonly events: CalendarEvent<TMeta>[];
  readonly firstDayOfWeek: number;
  readonly getEventManager: (
    event: CalendarEvent<TMeta>
  ) => CalendarPlugin<TMeta> | undefined;
  readonly getEventsForDateRange: (
    start: Temporal.ZonedDateTime,
    end: Temporal.ZonedDateTime
  ) => CalendarEvent<TMeta>[];
  /**
   * Events whose resource membership (`resourceIds`, falling back to
   * `resourceId`) contains the given resource. On a calendar without
   * resources this simply filters by the events' own resource fields.
   */
  readonly getEventsForResource: (
    resourceId: string | number
  ) => CalendarEvent<TMeta>[];
  readonly getViews: () => PluginView[];
  readonly isEventFormOpen: boolean;
  readonly nextPeriod: () => void;
  /**
   * Handle a click on an existing event: runs the consumer's `onEventClick`
   * callback if provided, otherwise opens the event for editing. Lets plugin
   * views (e.g. agenda) handle event clicks identically to the built-in views.
   */
  readonly onEventClick: (
    event: CalendarEvent<TMeta>,
    nativeEvent?: React.MouseEvent
  ) => void;
  readonly openEventForm: (eventData?: OpenEventFormInput) => void;
  /** Axis the views lay out along: 'horizontal' (columns) or 'vertical' (rows). */
  readonly orientation: "horizontal" | "vertical";
  readonly prevPeriod: () => void;
  readonly rawEvents: CalendarEvent<TMeta>[];
  /**
   * The consumer's custom current-time-indicator renderer, if provided. Lets
   * plugin views (e.g. agenda) render the indicator consistently with the
   * built-in views via the shared `@repo/design-system` CurrentTimeIndicator.
   */
  readonly renderCurrentTimeIndicator?: (
    props: RenderCurrentTimeIndicatorProps
  ) => React.ReactNode;
  readonly renderSlot: (
    slotName: string,
    context: PluginSlotContext
  ) => React.ReactNode[];
  readonly resources: Resource[];
  readonly selectDate: (date: Temporal.ZonedDateTime) => void;
  readonly selectedDate: Temporal.ZonedDateTime | null;
  readonly selectedEvent: CalendarEvent<TMeta> | null;
  readonly setCurrentDate: (
    action:
      | Temporal.ZonedDateTime
      | ((prev: Temporal.ZonedDateTime) => Temporal.ZonedDateTime)
  ) => void;
  readonly setDate: (date: Temporal.ZonedDateTime | string | Date) => void;
  /** Switch view; pass `date` to move there atomically in the same update. */
  readonly setView: (view: CalendarView, date?: Temporal.ZonedDateTime) => void;
  readonly t: TranslatorFunction;
  readonly timeFormat: TimeFormat;
  readonly timezone?: string;
  readonly today: () => void;
  readonly updateEvent: (
    eventId: string | number,
    event: Partial<CalendarEvent<TMeta>>
  ) => void;
  readonly view: CalendarView;
}

export const useCalendarStore = <TMeta = unknown>(): CalendarStore<TMeta> => {
  const store = useContext(CalendarStoreContext);

  if (!isCalendarStore<TMeta>(store)) {
    throw new Error("useCalendarStore must be used within a CalendarProvider");
  }

  return store;
};

/**
 * Internal hook that returns either selected state (with fine-grained reactivity via Zustand)
 * or the full calendar state.
 */
export function useSmartCalendarContext<
  TMeta = unknown,
>(): SmartCalendarContextType<TMeta>;
export function useSmartCalendarContext<T, TMeta = unknown>(
  selector: (context: SmartCalendarContextType<TMeta>) => T
): T;
export function useSmartCalendarContext<T, TMeta = unknown>(
  selector?: (context: SmartCalendarContextType<TMeta>) => T
): T | SmartCalendarContextType<TMeta> {
  const store = useContext(CalendarStoreContext);

  if (!isCalendarStore<TMeta>(store)) {
    throw new Error(
      "useSmartCalendarContext must be used within a CalendarProvider"
    );
  }

  const select =
    selector ?? ((state: SmartCalendarContextType<TMeta>) => state);

  const shallowSelector = useShallow<
    SmartCalendarContextType<TMeta>,
    T | SmartCalendarContextType<TMeta>
  >(select);

  return useStore(store, shallowSelector);
}

/**
 * Public hook exported for library users.
 * Returns a reactive calendar API with shallow equality.
 */
export const useCalendarContext = <TMeta = unknown>(): CalendarApi<TMeta> =>
  useSmartCalendarContext<CalendarApi<TMeta>, TMeta>((context) => ({
    addEvent: context.addEvent,
    applyScopedDelete: context.applyScopedDelete,
    applyScopedEdit: context.applyScopedEdit,
    businessHours: context.businessHours,
    closeEventForm: context.closeEventForm,
    collect: context.collect,
    currentDate: context.currentDate,
    currentLocale: context.currentLocale,
    currentRange: context.currentRange,
    deleteEvent: context.deleteEvent,
    events: context.events,
    firstDayOfWeek: context.firstDayOfWeek,
    getEventManager: context.getEventManager,
    getEventsForDateRange: context.getEventsForDateRange,
    getEventsForResource: context.getEventsForResource,
    getViews: context.getViews,
    isEventFormOpen: context.isEventFormOpen,
    nextPeriod: context.nextPeriod,
    onEventClick: context.onEventClick,
    openEventForm: context.openEventForm,
    orientation: context.orientation,
    prevPeriod: context.prevPeriod,
    rawEvents: context.rawEvents,
    renderCurrentTimeIndicator: context.renderCurrentTimeIndicator,
    renderSlot: context.renderSlot,
    resources: context.resources ?? EMPTY_RESOURCES,
    selectDate: context.selectDate,
    selectedDate: context.selectedDate,
    selectedEvent: context.selectedEvent,
    setCurrentDate: context.setCurrentDate,
    setDate: context.setDate,
    setView: context.setView,
    t: context.t,
    timeFormat: context.timeFormat,
    timezone: context.timezone,
    today: context.today,
    updateEvent: context.updateEvent,
    view: context.view,
  }));
