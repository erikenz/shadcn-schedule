import { useEffect, useReducer } from "react";
import type { ReactElement, ReactNode } from "react";
import type { Temporal } from "temporal-polyfill";

import type { EventFormProps } from "@/features/calendar/components/event-form/event-form";
import { createCalendarStore } from "@/features/calendar/store/calendar-store";
import type { CalendarStore } from "@/features/calendar/store/calendar-store";
import { CalendarStoreContext } from "@/features/calendar/store/calendar-store-context";
import type {
  CalendarClassesOverride,
  CalendarComponents,
  CellInfo,
  DateRange,
  EventSegment,
  RenderCurrentTimeIndicatorProps,
  SlotDuration,
} from "@/features/calendar/types/index";
import { composePluginProviders } from "@/features/plugins/lib/compose-plugin-providers";
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
} from "@/types/index";

export interface CalendarProviderProps<TMeta = unknown> {
  businessHours?: BusinessHours | BusinessHours[];
  // Optional, as React's own `PropsWithChildren` has it: a provider with no
  // content is a no-op, and `createElement(type, props, children)` stays valid.
  children?: ReactNode;
  className?: string;
  classesOverride?: CalendarClassesOverride;
  components?: CalendarComponents;
  /** Max stacked events per day in horizontal grids; the engine defaults it. */
  dayMaxEvents?: number;
  disableCellClick?: boolean;
  disableDragAndDrop?: boolean;
  disableEventClick?: boolean;
  enableSwipeNavigation?: boolean;
  eventHeight?: number;
  eventOverlap?: boolean;
  eventSpacing?: number;
  events?: CalendarEvent<TMeta>[];
  // 0 for Sunday, 1 for Monday, etc.
  firstDayOfWeek?: number;
  getCellClassName?: (info: CellInfo) => string;
  // Optional custom header class
  headerClassName?: string;
  // Optional custom header component
  headerComponent?: ReactNode;
  hiddenDays?: Set<number>;
  hideExportButton?: boolean;
  hideNonBusinessHours?: boolean;
  initialDate?: Temporal.ZonedDateTime;
  initialView?: CalendarView;
  isCellDisabled?: (info: CellInfo) => boolean;
  locale?: string;
  onCellClick?: (info: CellInfo) => void;
  onDateChange?: (date: Temporal.ZonedDateTime, range: DateRange) => void;
  onEventAdd?: (event: CalendarEvent<TMeta>) => void;
  onEventClick?: (
    event: CalendarEvent<TMeta>,
    nativeEvent?: React.MouseEvent
  ) => void;
  onEventDelete?: (event: CalendarEvent<TMeta>) => void;
  onEventUpdate?: (event: CalendarEvent<TMeta>) => void;
  onMoreEventsClick?: (
    day: Temporal.ZonedDateTime,
    events: CalendarEvent<TMeta>[]
  ) => void;
  onViewChange?: (view: CalendarView) => void;
  /** Resource arrangement preference. Only applies when `resources` is set. @default 'horizontal' */
  orientation?: "horizontal" | "vertical";
  plugins?: CalendarPlugin<TMeta>[];
  renderCurrentTimeIndicator?: (
    props: RenderCurrentTimeIndicatorProps
  ) => ReactNode;
  renderEvent?: (
    event: CalendarEvent<TMeta>,
    segment: EventSegment
  ) => ReactNode;
  renderEventForm?: (props: EventFormProps) => ReactNode;
  renderHour?: (date: Temporal.ZonedDateTime) => ReactNode;
  /** Custom render for resource header cells. */
  renderResource?: (resource: Resource) => React.ReactNode;
  /**
   * Custom width for the resource column in horizontal views (e.g. '3rem', '120px', 120, or 'w-24').
   */
  resourceColumnWidth?: string | number;
  /** Fixed height (px) for resource rows in horizontal hour-grids. */
  resourceRowHeight?: number;
  /**
   * Alias for `resourceColumnWidth`.
   */
  resourceWidth?: string | number;
  /** The resource axis. Absent/empty → a regular calendar (no filtering, no resource columns). */
  resources?: Resource[];
  scrollTime?: string;
  slotDuration?: SlotDuration;
  stickyViewHeader?: boolean;
  style?: React.CSSProperties & Record<string, string | number>;
  timeFormat?: TimeFormat;
  timezone?: string;
  // Translation options - provide either translations object OR translator function
  translations?: Translations;
  translator?: TranslatorFunction;
  viewHeaderClassName?: string;
  /** Custom view list for the view switcher, replacing the built-ins. */
  views?: PluginView[];
  /** Week-view granularity for resource weeks. @default 'hourly' */
  weekViewGranularity?: "hourly" | "daily";
}

export const CalendarProvider = <TMeta = unknown,>({
  children,
  ...props
}: CalendarProviderProps<TMeta>): ReactElement => {
  // The store is created once for the provider's lifetime and later prop changes
  // are pushed into it by `syncProps`, so it must never be replaced. `useReducer`
  // (rather than `useState`) because only the value is needed: React still
  // guarantees a lazily-initialized slot that is kept across renders.
  const [store] = useReducer(
    (current: CalendarStore<TMeta>) => current,
    props,
    createCalendarStore<TMeta>
  );

  // Synchronize dynamic prop updates into the Zustand store
  useEffect(() => {
    store.getState().syncProps(props);
  });

  const providers = store.getState().getProviders();
  const wrappedChildren = composePluginProviders(providers, children);

  return (
    <CalendarStoreContext.Provider value={store}>
      {wrappedChildren}
    </CalendarStoreContext.Provider>
  );
};
