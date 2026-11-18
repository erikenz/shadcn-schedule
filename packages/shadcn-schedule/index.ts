// Plugin slot catalog (host mount points)

export { Temporal } from "temporal-polyfill";

export {
  SLOT_EVENT_FORM,
  SLOT_EVENT_MUTATION_SCOPE,
} from "@/components/calendar-slots";

export { Calendar } from "@/features/calendar/components/calendar";

export {
  CalendarProvider,
  type CalendarProviderProps,
} from "@/features/calendar/contexts/calendar-context/provider";

export { EventForm } from "@/features/calendar/components/event-form/event-form";

export { EventFormDialog } from "@/features/calendar/components/event-form/event-form-dialog";

// Built-in view specs for composing custom view lists via the `views` prop.
export { dayView } from "@/features/calendar/components/views/day";

export { monthView } from "@/features/calendar/components/views/month";

export { weekView } from "@/features/calendar/components/views/week";

export { yearView } from "@/features/calendar/components/views/year";

// Public calendar context hooks
export {
  type CalendarApi,
  useCalendarContext,
} from "@/features/calendar/hooks/use-smart-calendar-context";

export {
  type SwipeNavigationOptions,
  useSwipeNavigation,
} from "@/features/calendar/hooks/use-swipe-navigation";

export { defaultTranslations } from "@/lib/translations/default";

export { esTranslations } from "@/lib/translations/es";

// The calendar's date-time parsing/formatting helpers (Temporal-backed)
export {
  diff,
  format,
  isAfter,
  isBefore,
  isSame,
  isSameOrAfter,
  isSameOrBefore,
  maxDateTime,
  minDateTime,
  now,
  setDefaultLocale,
  setDefaultTimeZone,
  startOf,
  toDate,
  toISOString,
  toZonedDateTime,
  unix,
  weekday,
} from "@/utils/temporal";

export type { EventFormProps } from "@/features/calendar/components/event-form/event-form";

export type {
  CalendarClassesOverride,
  CalendarComponents,
  CalendarProps,
  CellInfo,
  DateRange,
  EventSegment,
  OpenEventFormInput,
  RenderCurrentTimeIndicatorProps,
  SlotDuration,
} from "@/features/calendar/types";

// Translation system
export type {
  TranslationKey,
  Translations,
  TranslatorFunction,
} from "@/lib/translations/types";

// Shared contract types (slot context shapes, event model, Resource)
// Plugin SDK contract types
export type {
  BusinessHours,
  CalendarEvent,
  CalendarPlugin,
  CalendarView,
  ColumnSpec,
  EventFormSlotContext,
  EventMutationScopeSlotContext,
  HorizontalCellSpec,
  HorizontalRowSpec,
  PluginDateRange,
  PluginMutationArgs,
  PluginMutationResult,
  PluginSlotContext,
  PluginView,
  Resource,
  ResourceId,
  TimeFormat,
  VerticalColumnSpec,
  ViewConfig,
  ViewHeaderContext,
  WeekDays,
} from "@/types/index";
