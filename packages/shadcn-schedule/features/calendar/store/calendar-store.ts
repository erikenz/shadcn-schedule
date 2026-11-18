import type { ComponentType, ReactNode } from "react";
import type { Temporal } from "temporal-polyfill";
import { createStore } from "zustand";
import type { StoreApi } from "zustand";

import type { EventFormProps } from "@/features/calendar/components/event-form/event-form";
import { builtInViews } from "@/features/calendar/components/views/built-in-views";
import type { CalendarProviderProps } from "@/features/calendar/contexts/calendar-context/provider";
import type {
  CalendarClassesOverride,
  CalendarComponents,
  CellInfo,
  DateRange,
  EventSegment,
  OpenEventFormInput,
  RenderCurrentTimeIndicatorProps,
  SlotDuration,
} from "@/features/calendar/types/index";
import { resolveSetAction } from "@/features/calendar/utils/set-action";
import type { SetAction } from "@/features/calendar/utils/set-action";
import { createPluginRuntime } from "@/features/plugins/lib/create-plugin-runtime";
import type { PluginRuntime } from "@/features/plugins/lib/types";
import {
  DAY_MAX_EVENTS_DEFAULT,
  EVENT_BAR_HEIGHT,
  GAP_BETWEEN_ELEMENTS,
} from "@/lib/constants";
import {
  filterEventsForResource,
  getEventResourceIds,
} from "@/lib/events/pipeline";
import { hasText, textOr } from "@/lib/guards";
import { defaultTranslations } from "@/lib/translations/default";
import type {
  Translations,
  TranslatorFunction,
} from "@/lib/translations/types";
import { getMonthGridRange } from "@/lib/utils/date-utils";
import type {
  BusinessHours,
  CalendarEvent,
  CalendarPlugin,
  CalendarView,
  PluginMutationResult,
  PluginSlotContext,
  PluginView,
  Resource,
  TimeFormat,
} from "@/types/index";
import {
  addDuration,
  isSame,
  now,
  setDefaultLocale,
  setDefaultTimeZone,
  toZonedDateTime,
} from "@/utils/temporal";

const EMPTY_PLUGINS: never[] = [];
const EMPTY_EVENTS: never[] = [];
const EMPTY_RESOURCES: never[] = [];

const isPluginMutationResult = <TMeta = unknown>(
  result: CalendarEvent<TMeta>[] | PluginMutationResult<TMeta>
): result is PluginMutationResult<TMeta> => !Array.isArray(result);

const buildEventDraft = <TMeta = unknown>(
  draft: Omit<CalendarEvent<TMeta>, "id">
): CalendarEvent<TMeta> => ({
  ...draft,
  id: "",
});

const calculateViewRange = (
  date: Temporal.ZonedDateTime,
  viewSpec: PluginView | undefined,
  firstDayOfWeek: number
): DateRange =>
  viewSpec?.range?.(date, { firstDayOfWeek }) ??
  getMonthGridRange(date, firstDayOfWeek);

const resolveTranslator = (
  translations?: Translations,
  translator?: TranslatorFunction
): TranslatorFunction => {
  if (translator) {
    return translator;
  }

  const dict: Record<string, string> = translations ?? defaultTranslations;

  return (key: string) => {
    const label = dict[key];

    return hasText(label) ? label : key;
  };
};

interface MutableCallbacks<TMeta> {
  onCellClick?: (info: CellInfo) => void;
  onDateChange?: (date: Temporal.ZonedDateTime, range: DateRange) => void;
  onEventAdd?: (event: CalendarEvent<TMeta>) => void;
  onEventClick?: (
    event: CalendarEvent<TMeta>,
    nativeEvent?: React.MouseEvent
  ) => void;
  onEventDelete?: (event: CalendarEvent<TMeta>) => void;
  onEventUpdate?: (event: CalendarEvent<TMeta>) => void;
  onViewChange?: (view: CalendarView) => void;
}

/* oxlint-disable typescript/consistent-return, sonarjs/no-inconsistent-returns -- returns nothing on some paths on purpose; `return undefined` is banned by unicorn/no-useless-undefined */
const syncLayoutProps = <TMeta>(
  updates: Partial<CalendarState<TMeta>>,
  nextProps: Partial<CalendarStoreProps<TMeta>>
): void => {
  if (nextProps.businessHours !== undefined) {
    updates.businessHours = nextProps.businessHours;
  }

  if (nextProps.dayMaxEvents !== undefined) {
    updates.dayMaxEvents = nextProps.dayMaxEvents;
  }

  if (nextProps.firstDayOfWeek !== undefined) {
    updates.firstDayOfWeek = nextProps.firstDayOfWeek;
  }

  if (nextProps.hiddenDays !== undefined) {
    updates.hiddenDays = nextProps.hiddenDays;
  }

  if (nextProps.hideNonBusinessHours !== undefined) {
    updates.hideNonBusinessHours = nextProps.hideNonBusinessHours;
  }

  if (nextProps.orientation !== undefined) {
    updates.orientation = nextProps.orientation;
  }

  if (nextProps.resources !== undefined) {
    updates.resources = nextProps.resources;
  }

  if (nextProps.resourceRowHeight !== undefined) {
    updates.resourceRowHeight = nextProps.resourceRowHeight;
  }

  if (nextProps.scrollTime !== undefined) {
    updates.scrollTime = nextProps.scrollTime;
  }

  if (nextProps.slotDuration !== undefined) {
    updates.slotDuration = nextProps.slotDuration;
  }

  if (nextProps.timeFormat !== undefined) {
    updates.timeFormat = nextProps.timeFormat;
  }

  if (nextProps.weekViewGranularity !== undefined) {
    updates.weekViewGranularity = nextProps.weekViewGranularity;
  }
};

const syncPresentationProps = <TMeta>(
  updates: Partial<CalendarState<TMeta>>,
  nextProps: Partial<CalendarStoreProps<TMeta>>
): void => {
  if (nextProps.classesOverride !== undefined) {
    updates.classesOverride = nextProps.classesOverride;
  }

  if (nextProps.components !== undefined) {
    updates.components = nextProps.components;
  }

  if (nextProps.getCellClassName !== undefined) {
    updates.getCellClassName = nextProps.getCellClassName;
  }

  if (nextProps.headerClassName !== undefined) {
    updates.headerClassName = nextProps.headerClassName;
  }

  if (nextProps.headerComponent !== undefined) {
    updates.headerComponent = nextProps.headerComponent;
  }

  if (nextProps.renderCurrentTimeIndicator !== undefined) {
    updates.renderCurrentTimeIndicator = nextProps.renderCurrentTimeIndicator;
  }

  if (nextProps.renderEvent !== undefined) {
    updates.renderEvent = nextProps.renderEvent;
  }

  if (nextProps.renderEventForm !== undefined) {
    updates.renderEventForm = nextProps.renderEventForm;
  }

  if (nextProps.renderHour !== undefined) {
    updates.renderHour = nextProps.renderHour;
  }

  if (nextProps.renderResource !== undefined) {
    updates.renderResource = nextProps.renderResource;
  }

  if (nextProps.stickyViewHeader !== undefined) {
    updates.stickyViewHeader = nextProps.stickyViewHeader;
  }

  if (nextProps.viewHeaderClassName !== undefined) {
    updates.viewHeaderClassName = nextProps.viewHeaderClassName;
  }
};

const syncBehaviorProps = <TMeta>(
  updates: Partial<CalendarState<TMeta>>,
  nextProps: Partial<CalendarStoreProps<TMeta>>
): void => {
  if (nextProps.disableCellClick !== undefined) {
    updates.disableCellClick = nextProps.disableCellClick;
  }

  if (nextProps.disableDragAndDrop !== undefined) {
    updates.disableDragAndDrop = nextProps.disableDragAndDrop;
  }

  if (nextProps.disableEventClick !== undefined) {
    updates.disableEventClick = nextProps.disableEventClick;
  }

  if (nextProps.enableSwipeNavigation !== undefined) {
    updates.enableSwipeNavigation = nextProps.enableSwipeNavigation;
  }

  if (nextProps.eventHeight !== undefined) {
    updates.eventHeight = nextProps.eventHeight;
  }

  if (nextProps.eventOverlap !== undefined) {
    updates.eventOverlap = nextProps.eventOverlap;
  }

  if (nextProps.eventSpacing !== undefined) {
    updates.eventSpacing = nextProps.eventSpacing;
  }

  if (nextProps.hideExportButton !== undefined) {
    updates.hideExportButton = nextProps.hideExportButton;
  }

  if (nextProps.isCellDisabled !== undefined) {
    updates.isCellDisabled = nextProps.isCellDisabled;
  }

  if (nextProps.onMoreEventsClick !== undefined) {
    updates.onMoreEventsClick = nextProps.onMoreEventsClick;
  }
};

const syncI18nProps = <TMeta>(
  updates: Partial<CalendarState<TMeta>>,
  nextProps: Partial<CalendarStoreProps<TMeta>>,
  currentLocale: string,
  currentTimezone?: string
): void => {
  if (hasText(nextProps.locale) && nextProps.locale !== currentLocale) {
    updates.locale = nextProps.locale;
    updates.currentLocale = nextProps.locale;
    setDefaultLocale(nextProps.locale);
  }

  if (hasText(nextProps.timezone) && nextProps.timezone !== currentTimezone) {
    updates.timezone = nextProps.timezone;
    setDefaultTimeZone(nextProps.timezone);
  }

  if (
    nextProps.translations !== undefined ||
    nextProps.translator !== undefined
  ) {
    updates.t = resolveTranslator(nextProps.translations, nextProps.translator);
  }
};

const syncCallbacks = <TMeta>(
  callbacks: MutableCallbacks<TMeta>,
  nextProps: Partial<CalendarStoreProps<TMeta>>
): void => {
  if (nextProps.onCellClick !== undefined) {
    callbacks.onCellClick = nextProps.onCellClick;
  }

  if (nextProps.onDateChange !== undefined) {
    callbacks.onDateChange = nextProps.onDateChange;
  }

  if (nextProps.onEventAdd !== undefined) {
    callbacks.onEventAdd = nextProps.onEventAdd;
  }

  if (nextProps.onEventClick !== undefined) {
    callbacks.onEventClick = nextProps.onEventClick;
  }

  if (nextProps.onEventDelete !== undefined) {
    callbacks.onEventDelete = nextProps.onEventDelete;
  }

  if (nextProps.onEventUpdate !== undefined) {
    callbacks.onEventUpdate = nextProps.onEventUpdate;
  }

  if (nextProps.onViewChange !== undefined) {
    callbacks.onViewChange = nextProps.onViewChange;
  }
};

interface SyncTracker<TMeta> {
  lastEventsProp: CalendarEvent<TMeta>[] | undefined;
  lastInitialDateProp: string | Temporal.ZonedDateTime | Date | undefined;
}

const syncDataProps = <TMeta>(
  updates: Partial<CalendarState<TMeta>>,
  nextProps: Partial<CalendarStoreProps<TMeta>>,
  currentState: CalendarState<TMeta>,
  tracker: SyncTracker<TMeta>
): boolean => {
  let needsReprocessing = false;

  if (
    nextProps.initialDate !== undefined &&
    nextProps.initialDate !== tracker.lastInitialDateProp
  ) {
    tracker.lastInitialDateProp = nextProps.initialDate;
    const nextZoned = toZonedDateTime(nextProps.initialDate);

    if (!isSame(nextZoned, currentState.currentDate, "day")) {
      updates.currentDate = nextZoned;
      needsReprocessing = true;
    }
  }

  if (
    nextProps.events !== undefined &&
    nextProps.events !== tracker.lastEventsProp
  ) {
    tracker.lastEventsProp = nextProps.events;
    updates.rawEvents = nextProps.events;
    needsReprocessing = true;
  }

  if (nextProps.views !== undefined && nextProps.views !== currentState.views) {
    updates.views = nextProps.views;
    needsReprocessing = true;
  }

  return needsReprocessing;
};

const recomputeEventsAndRange = <TMeta>(
  updates: Partial<CalendarState<TMeta>>,
  currentState: CalendarState<TMeta>,
  resolveViewSpec: (view: CalendarView) => PluginView | undefined,
  transformEvents: (
    raw: CalendarEvent<TMeta>[],
    range: DateRange
  ) => CalendarEvent<TMeta>[]
): void => {
  const raw = updates.rawEvents ?? currentState.rawEvents;
  const currentView = updates.view ?? currentState.view;
  const currentDate = updates.currentDate ?? currentState.currentDate;
  const firstDay = updates.firstDayOfWeek ?? currentState.firstDayOfWeek;
  const spec = resolveViewSpec(currentView);
  const range = calculateViewRange(currentDate, spec, firstDay);
  updates.currentRange = range;
  updates.events = transformEvents(raw, range);
};

/** Whether any of the event's resources is in `resourceIds`. */
const overlapsResources = <TMeta>(
  event: CalendarEvent<TMeta>,
  resourceIds: Set<string | number>
): boolean => getEventResourceIds(event).some((id) => resourceIds.has(id));

export interface CalendarState<TMeta = unknown> {
  // Data / Events
  addEvent: (event: CalendarEvent<TMeta>) => void;
  applyScopedDelete: (event: CalendarEvent<TMeta>, scope: string) => void;
  applyScopedEdit: (
    event: CalendarEvent<TMeta>,
    updates: Partial<CalendarEvent<TMeta>>,
    scope: string
  ) => void;
  // Config
  businessHours?: BusinessHours | BusinessHours[];
  classesOverride?: CalendarClassesOverride;
  components?: CalendarComponents;

  // Interaction
  closeEventForm: () => void;

  // Plugins
  collect: (point: string, context: CalendarEvent) => unknown[];

  // Navigation
  currentDate: Temporal.ZonedDateTime;
  currentLocale: string;
  currentRange: DateRange;
  dayMaxEvents: number;
  deleteEvent: (eventId: string | number) => void;
  disableCellClick: boolean;
  disableDragAndDrop: boolean;
  disableEventClick: boolean;
  enableSwipeNavigation: boolean;
  eventHeight: number;
  eventOverlap?: boolean;
  eventSpacing: number;
  events: CalendarEvent<TMeta>[];
  firstDayOfWeek: number;
  getAllViews: () => PluginView[];
  getCellClassName?: (info: CellInfo) => string;
  getCurrentViewRange: () => DateRange;
  getEventManager: (
    event: CalendarEvent<TMeta>
  ) => CalendarPlugin<TMeta> | undefined;
  getEventResourceIds: (event: CalendarEvent<TMeta>) => (string | number)[];
  getEventsForDateRange: (
    start: Temporal.ZonedDateTime,
    end: Temporal.ZonedDateTime
  ) => CalendarEvent<TMeta>[];
  getEventsForResource: (resourceId: string | number) => CalendarEvent<TMeta>[];
  getEventsForResources: (
    resourceIds: (string | number)[]
  ) => CalendarEvent<TMeta>[];
  getProviders: () => ComponentType<{ children: ReactNode }>[];
  getResourceById: (
    resourceId: string | number | undefined
  ) => Resource | undefined;
  getViews: () => PluginView[];
  headerClassName?: string;
  headerComponent?: ReactNode;
  hiddenDays?: Set<number>;
  hideExportButton: boolean;
  hideNonBusinessHours: boolean;
  isCellDisabled?: (info: CellInfo) => boolean;
  isEventCrossResource: (event: CalendarEvent<TMeta>) => boolean;
  isEventFormOpen: boolean;
  locale?: string;
  nextPeriod: () => void;
  onCellClick: (info: CellInfo) => void;
  onEventClick: (
    event: CalendarEvent<TMeta>,
    nativeEvent?: React.MouseEvent
  ) => void;
  onMoreEventsClick?: (
    day: Temporal.ZonedDateTime,
    events: CalendarEvent<TMeta>[]
  ) => void;
  openEventForm: (eventData?: OpenEventFormInput) => void;
  orientation: "horizontal" | "vertical";
  plugins: CalendarPlugin<TMeta>[];
  prevPeriod: () => void;
  rawEvents: CalendarEvent<TMeta>[];
  renderCurrentTimeIndicator?: (
    props: RenderCurrentTimeIndicatorProps
  ) => ReactNode;
  renderEvent?: (
    event: CalendarEvent<TMeta>,
    segment: EventSegment
  ) => ReactNode;
  renderEventForm?: (props: EventFormProps) => ReactNode;
  renderHour?: (date: Temporal.ZonedDateTime) => ReactNode;
  renderResource?: (resource: Resource) => ReactNode;
  renderSlot: (slotName: string, context: PluginSlotContext) => ReactNode[];
  resourceRowHeight?: number;
  resources?: Resource[];
  scrollTime?: string;
  selectDate: (date: Temporal.ZonedDateTime) => void;
  selectedDate: Temporal.ZonedDateTime | null;
  selectedEvent: CalendarEvent<TMeta> | null;
  setCurrentDate: (action: SetAction<Temporal.ZonedDateTime>) => void;
  setCurrentEvents: (action: SetAction<CalendarEvent<TMeta>[]>) => void;
  setDate: (date: Temporal.ZonedDateTime | string | Date) => void;
  setIsEventFormOpen: (action: SetAction<boolean>) => void;
  setSelectedDate: (action: SetAction<Temporal.ZonedDateTime | null>) => void;
  setSelectedEvent: (action: SetAction<CalendarEvent<TMeta> | null>) => void;
  setView: (view: CalendarView, date?: Temporal.ZonedDateTime) => void;
  slotDuration: SlotDuration;
  stickyViewHeader: boolean;

  // Prop sync
  syncProps: (props: Partial<CalendarStoreProps<TMeta>>) => void;
  t: TranslatorFunction;
  timeFormat: TimeFormat;
  timezone?: string;
  today: () => void;
  updateEvent: (
    eventId: string | number,
    updates: Partial<CalendarEvent<TMeta>>
  ) => void;
  view: CalendarView;
  viewHeaderClassName: string;
  views?: PluginView[];
  weekViewGranularity: "hourly" | "daily";
}

export type CalendarStore<TMeta = unknown> = StoreApi<CalendarState<TMeta>>;

export type CalendarStoreProps<TMeta = unknown> = Omit<
  CalendarProviderProps<TMeta>,
  "children"
>;

/**
 * The layout/theme props with their defaults. Mirrors `syncLayoutProps`: the
 * same group the store re-syncs when the consumer changes one of them.
 */
const resolveLayoutDefaults = (
  props: Pick<
    CalendarStoreProps,
    | "dayMaxEvents"
    | "eventSpacing"
    | "firstDayOfWeek"
    | "hideExportButton"
    | "hideNonBusinessHours"
    | "orientation"
    | "resources"
    | "slotDuration"
    | "timeFormat"
    | "weekViewGranularity"
  >
) => {
  const {
    dayMaxEvents = DAY_MAX_EVENTS_DEFAULT,
    eventSpacing = GAP_BETWEEN_ELEMENTS,
    firstDayOfWeek = 0,
    hideExportButton = false,
    hideNonBusinessHours = false,
    orientation = "horizontal",
    resources = EMPTY_RESOURCES,
    slotDuration = 60,
    timeFormat = "12-hour",
    weekViewGranularity = "hourly",
  } = props;

  return {
    dayMaxEvents,
    eventSpacing,
    firstDayOfWeek,
    hideExportButton,
    hideNonBusinessHours,
    orientation,
    resources,
    slotDuration,
    timeFormat,
    weekViewGranularity,
  };
};

export const createCalendarStore = <TMeta = unknown>(
  initialProps: CalendarStoreProps<TMeta>
): CalendarStore<TMeta> => {
  const {
    businessHours,
    classesOverride,
    components,
    disableCellClick = false,
    disableDragAndDrop = false,
    disableEventClick = false,
    enableSwipeNavigation = true,
    eventHeight = EVENT_BAR_HEIGHT,
    eventOverlap,
    events = EMPTY_EVENTS,
    getCellClassName,
    headerClassName,
    headerComponent,
    hiddenDays,
    initialDate = now(),
    initialView = "month",
    isCellDisabled,
    locale,
    onMoreEventsClick,
    plugins = EMPTY_PLUGINS,
    renderCurrentTimeIndicator,
    renderEvent,
    renderEventForm,
    renderHour,
    renderResource,
    resourceRowHeight,
    scrollTime,
    stickyViewHeader = true,
    timezone = initialDate.timeZoneId,
    translations,
    translator,
    viewHeaderClassName = "",
    views,
  } = initialProps;

  const {
    dayMaxEvents,
    eventSpacing,
    firstDayOfWeek,
    hideExportButton,
    hideNonBusinessHours,
    orientation,
    resources,
    slotDuration,
    timeFormat,
    weekViewGranularity,
  } = resolveLayoutDefaults(initialProps);

  const callbacks: MutableCallbacks<TMeta> = {
    onCellClick: initialProps.onCellClick,
    onDateChange: initialProps.onDateChange,
    onEventAdd: initialProps.onEventAdd,
    onEventClick: initialProps.onEventClick,
    onEventDelete: initialProps.onEventDelete,
    onEventUpdate: initialProps.onEventUpdate,
    onViewChange: initialProps.onViewChange,
  };

  let pluginRuntime: PluginRuntime<TMeta> = createPluginRuntime(plugins);

  const initialZonedDate = toZonedDateTime(initialDate);
  const initialLocale = textOr(locale, "en");
  const initialTranslator = resolveTranslator(translations, translator);

  const syncTracker: SyncTracker<TMeta> = {
    lastEventsProp: events,
    lastInitialDateProp: initialDate,
  };

  const initialBaseViews = views ?? builtInViews;
  const initialPluginViews = [...initialBaseViews, ...pluginRuntime.getViews()];

  const resolveInitialViewSpec = (name: CalendarView): PluginView | undefined =>
    initialPluginViews.find((v) => v.name === name);

  return createStore<CalendarState<TMeta>>((set, get) => {
    const getAllViews = (): PluginView[] => [
      ...(get().views ?? initialBaseViews),
      ...pluginRuntime.getViews(),
    ];

    const resolveViewSpec = (name: CalendarView): PluginView | undefined =>
      getAllViews().find((v) => v.name === name);

    const getCurrentViewRange = (): DateRange => {
      const state = get();

      return calculateViewRange(
        state.currentDate,
        resolveViewSpec(state.view),
        state.firstDayOfWeek
      );
    };

    // oxlint-disable-next-line unicorn/consistent-function-scoping -- captures values from its enclosing scope
    const transformEvents = (
      raw: CalendarEvent<TMeta>[],
      range: DateRange
    ): CalendarEvent<TMeta>[] => pluginRuntime.transformEvents(raw, range);

    const initialRange = calculateViewRange(
      initialZonedDate,
      resolveInitialViewSpec(initialView),
      firstDayOfWeek
    );

    const initialProcessedEvents = transformEvents(events, initialRange);

    const notifyDateChange = (
      date: Temporal.ZonedDateTime,
      view: CalendarView
    ) => {
      const range = calculateViewRange(
        date,
        resolveViewSpec(view),
        get().firstDayOfWeek
      );

      callbacks.onDateChange?.(date, range);
    };

    return {
      addEvent: (event) => {
        const nextRaw = [...get().rawEvents, event];
        const range = get().currentRange;
        set({
          events: transformEvents(nextRaw, range),
          rawEvents: nextRaw,
        });
        callbacks.onEventAdd?.(event);
      },

      applyScopedDelete: (event, scope) => {
        const manager = pluginRuntime.getEventManager(event);

        if (!manager?.applyDelete) {
          return;
        }

        const deleteResult = manager.applyDelete({
          currentEvents: get().rawEvents,
          event,
          scope,
        });

        if (isPluginMutationResult(deleteResult)) {
          for (const storedEvent of deleteResult.updated) {
            callbacks.onEventUpdate?.(storedEvent);
          }

          for (const storedEvent of deleteResult.added) {
            callbacks.onEventAdd?.(storedEvent);
          }

          for (const storedEvent of deleteResult.deleted) {
            callbacks.onEventDelete?.(storedEvent);
          }

          const range = get().currentRange;
          set({
            events: transformEvents(deleteResult.events, range),
            rawEvents: deleteResult.events,
          });

          return;
        }

        callbacks.onEventDelete?.(event);
        const range = get().currentRange;
        set({
          events: transformEvents(deleteResult, range),
          rawEvents: deleteResult,
        });
      },

      applyScopedEdit: (event, updates, scope) => {
        const manager = pluginRuntime.getEventManager(event);

        if (!manager?.applyEdit) {
          return;
        }

        const editResult = manager.applyEdit({
          currentEvents: get().rawEvents,
          event,
          scope,
          updates,
        });

        if (isPluginMutationResult(editResult)) {
          for (const storedEvent of editResult.updated) {
            callbacks.onEventUpdate?.(storedEvent);
          }

          for (const storedEvent of editResult.added) {
            callbacks.onEventAdd?.(storedEvent);
          }

          for (const storedEvent of editResult.deleted) {
            callbacks.onEventDelete?.(storedEvent);
          }

          const range = get().currentRange;
          set({
            events: transformEvents(editResult.events, range),
            rawEvents: editResult.events,
          });

          return;
        }

        callbacks.onEventUpdate?.({ ...event, ...updates });
        const range = get().currentRange;
        set({
          events: transformEvents(editResult, range),
          rawEvents: editResult,
        });
      },
      closeEventForm: () => {
        set({
          isEventFormOpen: false,
          selectedDate: null,
          selectedEvent: null,
        });
      },
      collect: (point, context) => pluginRuntime.collect(point, context),

      // Navigation values & methods
      currentDate: initialZonedDate,
      currentLocale: initialLocale,

      currentRange: initialRange,
      deleteEvent: (eventId) => {
        const eventToDelete = get().rawEvents.find((e) => e.id === eventId);

        if (!eventToDelete) {
          return;
        }

        const nextRaw = get().rawEvents.filter((e) => e.id !== eventId);
        const range = get().currentRange;
        set({
          events: transformEvents(nextRaw, range),
          rawEvents: nextRaw,
        });
        callbacks.onEventDelete?.(eventToDelete);
      },
      // Data / Events values & methods
      events: initialProcessedEvents,
      getEventManager: (event) => pluginRuntime.getEventManager(event),

      getEventsForDateRange: (start, end) =>
        pluginRuntime.transformEvents(get().rawEvents, { end, start }),
      getEventsForResource: (resourceId) =>
        filterEventsForResource(get().events, resourceId),
      getEventsForResources: (resourceIds) => {
        const resourceIdSet = new Set(resourceIds);

        return get().events.filter((event) =>
          overlapsResources(event, resourceIdSet)
        );
      },
      getProviders: () => pluginRuntime.getProviders(),
      getResourceById: (resourceId) => {
        if (resourceId === undefined) {
          return;
        }

        return get().resources?.find((r) => r.id === resourceId);
      },
      getViews: getAllViews,
      isEventCrossResource: (event) =>
        Boolean(event.resourceIds && event.resourceIds.length > 1),
      // Interaction values & methods
      isEventFormOpen: false,

      nextPeriod: () => {
        const { currentDate, view } = get();
        const spec = resolveViewSpec(view);

        const step = spec?.navigationStep ?? {
          amount: 1,
          unit: spec?.navigationUnit ?? "day",
        };

        const nextDate = addDuration(currentDate, step.amount, step.unit);
        const range = calculateViewRange(nextDate, spec, get().firstDayOfWeek);
        const nextEvents = transformEvents(get().rawEvents, range);
        set({
          currentDate: nextDate,
          currentRange: range,
          events: nextEvents,
        });
        notifyDateChange(nextDate, view);
      },
      onCellClick: (info) => {
        if (get().disableCellClick) {
          return;
        }

        if (callbacks.onCellClick) {
          callbacks.onCellClick(info);

          return;
        }

        get().openEventForm(info);
      },
      onEventClick: (event, nativeEvent) => {
        if (get().disableEventClick) {
          return;
        }

        if (callbacks.onEventClick) {
          callbacks.onEventClick(event, nativeEvent);

          return;
        }

        set({
          isEventFormOpen: true,
          selectedEvent: event,
        });
      },
      openEventForm: (eventData = {}) => {
        const { start, end, resourceId, resource, allDay } = eventData;

        if (start) {
          set({ selectedDate: start });
        }

        const draftStart = start ?? get().currentDate;
        set({
          isEventFormOpen: true,
          selectedEvent: buildEventDraft<TMeta>({
            allDay: allDay ?? false,
            description: "",
            end: end ?? draftStart.add({ hours: 1 }),
            resourceId: resourceId ?? resource?.id,
            start: draftStart,
            title: get().t("newEvent"),
          }),
        });
      },
      prevPeriod: () => {
        const { currentDate, view } = get();
        const spec = resolveViewSpec(view);

        const step = spec?.navigationStep ?? {
          amount: 1,
          unit: spec?.navigationUnit ?? "day",
        };

        const nextDate = addDuration(currentDate, -step.amount, step.unit);
        const range = calculateViewRange(nextDate, spec, get().firstDayOfWeek);
        const nextEvents = transformEvents(get().rawEvents, range);
        set({
          currentDate: nextDate,
          currentRange: range,
          events: nextEvents,
        });
        notifyDateChange(nextDate, view);
      },
      rawEvents: events,
      renderSlot: (slotName, context) =>
        pluginRuntime.renderSlot(slotName, context),

      selectDate: (date: Temporal.ZonedDateTime) => {
        const { view } = get();
        const spec = resolveViewSpec(view);
        const range = calculateViewRange(date, spec, get().firstDayOfWeek);
        const nextEvents = transformEvents(get().rawEvents, range);
        set({
          currentDate: date,
          currentRange: range,
          events: nextEvents,
        });
        notifyDateChange(date, view);
      },

      selectedDate: null,

      selectedEvent: null,
      setCurrentDate: (action) => {
        const prev = get().currentDate;
        const nextDate = resolveSetAction(action, prev);
        const { view } = get();
        const spec = resolveViewSpec(view);
        const range = calculateViewRange(nextDate, spec, get().firstDayOfWeek);
        const nextEvents = transformEvents(get().rawEvents, range);
        set({
          currentDate: nextDate,
          currentRange: range,
          events: nextEvents,
        });
        notifyDateChange(nextDate, view);
      },

      setCurrentEvents: (action) => {
        const prev = get().rawEvents;
        const nextRaw = resolveSetAction(action, prev);
        const range = get().currentRange;
        set({
          events: transformEvents(nextRaw, range),
          rawEvents: nextRaw,
        });
      },
      setDate: (date: Temporal.ZonedDateTime | string | Date) => {
        const nextDate = toZonedDateTime(date);
        const { view } = get();
        const spec = resolveViewSpec(view);
        const range = calculateViewRange(nextDate, spec, get().firstDayOfWeek);
        const nextEvents = transformEvents(get().rawEvents, range);
        set({
          currentDate: nextDate,
          currentRange: range,
          events: nextEvents,
        });
        notifyDateChange(nextDate, view);
      },
      setIsEventFormOpen: (action) => {
        const prev = get().isEventFormOpen;
        set({
          isEventFormOpen: resolveSetAction(action, prev),
        });
      },
      setSelectedDate: (action) => {
        const prev = get().selectedDate;
        set({
          selectedDate: resolveSetAction(action, prev),
        });
      },
      setSelectedEvent: (action) => {
        const prev = get().selectedEvent;
        set({
          selectedEvent: resolveSetAction(action, prev),
        });
      },
      setView: (newView: CalendarView, date?: Temporal.ZonedDateTime) => {
        const targetDate = date ?? get().currentDate;
        const spec = resolveViewSpec(newView);

        const range = calculateViewRange(
          targetDate,
          spec,
          get().firstDayOfWeek
        );

        const nextEvents = transformEvents(get().rawEvents, range);
        set({
          currentDate: targetDate,
          currentRange: range,
          events: nextEvents,
          view: newView,
        });
        callbacks.onViewChange?.(newView);
        notifyDateChange(targetDate, newView);
      },
      // Synchronize props dynamically from parent component renders
      syncProps: (nextProps) => {
        syncCallbacks(callbacks, nextProps);
        const updates: Partial<CalendarState<TMeta>> = {};
        syncLayoutProps(updates, nextProps);
        syncPresentationProps(updates, nextProps);
        syncBehaviorProps(updates, nextProps);
        syncI18nProps(updates, nextProps, get().currentLocale, get().timezone);

        let needsEventReprocessing = false;

        if (nextProps.plugins && nextProps.plugins !== get().plugins) {
          pluginRuntime = createPluginRuntime(nextProps.plugins);
          updates.plugins = nextProps.plugins;
          needsEventReprocessing = true;
        }

        if (syncDataProps(updates, nextProps, get(), syncTracker)) {
          needsEventReprocessing = true;
        }

        if (needsEventReprocessing) {
          recomputeEventsAndRange(
            updates,
            get(),
            resolveViewSpec,
            transformEvents
          );
        }

        if (Object.keys(updates).length > 0) {
          set(updates);
        }
      },
      t: initialTranslator,

      today: () => {
        const nextDate = now();
        const { view } = get();
        const spec = resolveViewSpec(view);
        const range = calculateViewRange(nextDate, spec, get().firstDayOfWeek);
        const nextEvents = transformEvents(get().rawEvents, range);
        set({
          currentDate: nextDate,
          currentRange: range,
          events: nextEvents,
        });
        notifyDateChange(nextDate, view);
      },

      updateEvent: (eventId, updates) => {
        const eventToUpdate = get().rawEvents.find((e) => e.id === eventId);

        if (!eventToUpdate) {
          return;
        }

        const updated = { ...eventToUpdate, ...updates };

        const nextRaw = get().rawEvents.map((e) =>
          e.id === eventId ? updated : e
        );

        const range = get().currentRange;
        set({
          events: transformEvents(nextRaw, range),
          rawEvents: nextRaw,
        });
        callbacks.onEventUpdate?.(updated);
      },
      view: initialView,

      // Config values
      businessHours,

      classesOverride,
      components,

      dayMaxEvents,
      disableCellClick,

      disableDragAndDrop,
      disableEventClick,

      enableSwipeNavigation,

      eventHeight,
      eventOverlap,
      eventSpacing,
      firstDayOfWeek,
      getAllViews,
      getCellClassName,
      getCurrentViewRange,
      getEventResourceIds,
      headerClassName,
      headerComponent,
      hiddenDays,

      hideExportButton,
      hideNonBusinessHours,
      isCellDisabled,

      locale,

      onMoreEventsClick,

      orientation,

      // Plugins
      plugins,

      renderCurrentTimeIndicator,

      renderEvent,

      renderEventForm,
      renderHour,
      renderResource,

      resourceRowHeight,
      resources,
      scrollTime,
      slotDuration,

      stickyViewHeader,

      timeFormat,
      timezone,
      viewHeaderClassName,
      views,
      weekViewGranularity,
    };
  });
};

/* oxlint-enable typescript/consistent-return, sonarjs/no-inconsistent-returns */
