import type { ComponentType, ReactNode } from "react";
import type { Temporal } from "temporal-polyfill";

/** A calendar navigation/date-math unit. */
export type NavUnit =
  | "day"
  | "week"
  | "month"
  | "year"
  | "hour"
  | "minute"
  | "second"
  | "millisecond";

/**
 * The primary data structure for calendar events.
 *
 * `TMeta` types the optional custom `meta` payload, so consumers can carry
 * application-specific data (e.g. a booking id) without assertions.
 */
export interface CalendarEvent<TMeta = unknown> {
  /**
   * Whether this is an all-day event
   * @default false
   */
  allDay?: boolean;
  /**
   * Background color for the event (supports CSS color values, hex, rgb, hsl, or CSS class names).
   * Null when the event uses a Tailwind class-pair `color` instead.
   * @example "#dbeafe", "blue-100", "rgba(59, 130, 246, 0.1)"
   */
  backgroundColor?: string | null;
  /**
   * Color for the event (supports CSS color values, hex, rgb, hsl, or CSS class names)
   * @example "#3b82f6", "blue-500", "rgb(59, 130, 246)"
   */
  color?: string;
  /** Optional description or notes for the event */
  description?: string;
  /** End date and time of the event (a Temporal.ZonedDateTime) */
  end: Temporal.ZonedDateTime;
  /** Unique identifier for the event */
  id: string | number;
  /** Optional location where the event takes place */
  location?: string;
  /**
   * Optional custom metadata payload, typed via the `TMeta` generic.
   * Prefer `meta` over `data` when the shape is known at compile time.
   */
  meta?: TMeta;
  /** Single resource assignment */
  resourceId?: ResourceId;
  /** Multiple resource assignment (cross-resource events) */
  resourceIds?: ResourceId[];
  /**
   * Events sharing a `stackGroup` never occupy different overlap columns:
   * they are placed together in one column (stacked) inside a cluster. Use it
   * for events that are mutually exclusive by domain rule (e.g. two
   * availability slots of the same service can never overlap), so a cluster
   * of "service A + service B" events renders as 2 columns instead of 3.
   * Events without a `stackGroup` each get their own column.
   */
  stackGroup?: string;
  /** Start date and time of the event (a Temporal.ZonedDateTime) */
  start: Temporal.ZonedDateTime;
  /** Display title of the event */
  title: string;
  /**
   * UID for iCalendar compatibility
   * Unique identifier across calendar systems. Null for events that carry no
   * UID of their own (the engine derives one from the id when needed).
   */
  uid?: string | null;
}

/**
 * Supported days of the week for calendar configuration.
 * Used for setting the first day of the week and other week-related settings.
 */
export type WeekDays =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

/**
 * Configuration for business hours.
 * Defines the working hours to be highlighted on the calendar.
 */
export interface BusinessHours {
  /**
   * Days of the week to apply business hours to.
   * @default ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
   */
  daysOfWeek?: WeekDays[];
  /**
   * End time for business hours: a whole 24-hour number (0-24) or an
   * 'HH:mm' string for sub-hour boundaries (e.g. '17:15'). Fractional
   * numbers round to the nearest hour — use a string for sub-hour precision.
   * @default 17
   */
  endTime?: number | string;
  /**
   * Start time for business hours: a whole 24-hour number (0-24) or an
   * 'HH:mm' string for sub-hour boundaries (e.g. '09:15'). Fractional
   * numbers round to the nearest hour — use a string for sub-hour precision.
   * @default 9
   */
  startTime?: number | string;
}

/**
 * Identifier type for resources and resource assignments.
 */
export type ResourceId = string | number;

/**
 * Resource interface representing a calendar resource (person, room, equipment, etc.)
 */
export interface Resource<TMeta = unknown> {
  /**
   * Background color for the resource (supports CSS color values, hex, rgb, hsl, or CSS class names)
   * @example "#dbeafe", "blue-100", "rgba(59, 130, 246, 0.1)"
   */
  backgroundColor?: string;
  /**
   * Configuration for resource-specific business hours.
   * If provided, these will be used instead of the global business hours for this resource.
   */
  businessHours?: BusinessHours | BusinessHours[];
  /**
   * Color for the resource (supports CSS color values, hex, rgb, hsl, or CSS class names)
   * @example "#3b82f6", "blue-500", "rgb(59, 130, 246)"
   */
  color?: string;
  /** Unique identifier for the resource */
  id: ResourceId;
  /** Display title or label of the resource */
  label?: string;
  /**
   * Optional custom metadata payload, typed via the `TMeta` generic.
   * The single metadata slot on resources (the event type's `meta` twin).
   */
  meta?: TMeta;
  /** Display title of the resource */
  title?: string;
}

// --- Plugin SDK contract ---------------------------------------------------

export interface PluginDateRange {
  end: Temporal.ZonedDateTime;
  start: Temporal.ZonedDateTime;
}

export interface PluginMutationArgs<TMeta = unknown> {
  currentEvents: CalendarEvent<TMeta>[];
  event: CalendarEvent<TMeta>;
  /**
   * The mutation strategy the user picked in the owning plugin's scope picker
   * (e.g. recurrence's 'this' | 'following' | 'all'). A plugin-defined key: the
   * core relays it verbatim from the picker to `applyEdit`/`applyDelete`
   * without interpreting it, and the plugin narrows it at its boundary (see
   * `toRecurrenceEditScope` in the recurrence plugin).
   */
  scope: string;
  updates?: Partial<CalendarEvent<TMeta>>;
}

/** Structured result from `applyEdit` when a mutation updates multiple stored rows. */
export interface PluginMutationResult<TMeta = unknown> {
  /** New rows to persist via `onEventAdd`. */
  added: CalendarEvent<TMeta>[];
  /** Existing rows to persist via `onEventDelete`. */
  deleted: CalendarEvent<TMeta>[];
  events: CalendarEvent<TMeta>[];
  /** Existing rows to persist via `onEventUpdate`. */
  updated: CalendarEvent<TMeta>[];
}

/**
 * Calendar configuration handed to a view's `columns()`/`renderHeader()`.
 * Carries the resource axis (`resources`, `orientation`) so a resource-capable
 * view can compose both arrangements. `range()` receives only the
 * `firstDayOfWeek` slice (see its own signature).
 */
export interface ViewConfig {
  businessHours?: BusinessHours | BusinessHours[];
  firstDayOfWeek: number;
  hiddenDays?: Set<number>;
  hideNonBusinessHours?: boolean;
  /**
   * The calendar-level resource arrangement (the user's choice): where the
   * resource axis goes. Only meaningful when `resources` is set.
   */
  orientation?: "vertical" | "horizontal";
  /** The resource axis. Set only when the calendar renders resources. */
  resources?: Resource[];
  /**
   * Week-view granularity when `resources` is set: 'hourly' (default) nests
   * hour slots under each day; 'daily' shows one cell per day.
   */
  weekViewGranularity?: "hourly" | "daily";
}

/**
 * One column of a 'vertical' view (time flows down the column).
 * Formalizes the calendar's existing VerticalGrid column input.
 */
export interface VerticalColumnSpec {
  className?: string;
  /** The date this column represents; gutter/label columns leave it unset. */
  day?: Temporal.ZonedDateTime;
  /** The cells of the column: hour slots (gridType 'hour') or dates ('day'). */
  days: Temporal.ZonedDateTime[];
  gridType?: "day" | "hour";
  /** Stable column id; drives testids and React keys. */
  id: string;
  /** Label-only column (e.g. the time gutter): renders no events. */
  noEvents?: boolean;
  renderCell?: (date: Temporal.ZonedDateTime) => ReactNode;
  /**
   * Resource-axis identity when the column belongs to one resource. The
   * single carrier: consumers derive the id from `resource.id`.
   */
  resource?: Resource;
}

/** One cell of a 'horizontal' row. */
export interface HorizontalCellSpec {
  className?: string;
  day?: Temporal.ZonedDateTime;
  /** A grouped cell spanning several dates (nested-axis arrangements). */
  days?: Temporal.ZonedDateTime[];
  gridType: "day" | "hour";
  id: string;
}

/**
 * One row of a 'horizontal' view (date cells flow across the row).
 * Formalizes the calendar's existing HorizontalGrid row input.
 */
export interface HorizontalRowSpec {
  className?: string;
  columns?: HorizontalCellSpec[];
  /** Stable row id; drives testids and React keys (matches VerticalColumnSpec.id). */
  id: string;
  /** Resource-axis identity when the row belongs to one resource. */
  resource?: Resource;
  showDayNumber?: boolean;
}

/** What a view's `columns()` returns; `layout` picks which engine consumes it. */
export type ColumnSpec = VerticalColumnSpec | HorizontalRowSpec;

/** Context passed to a view's `renderHeader`. */
export interface ViewHeaderContext {
  config: ViewConfig;
  date: Temporal.ZonedDateTime;
}

/**
 * Describes a view type — contributed by a plugin or built into the calendar
 * core (the four built-ins are themselves `PluginView` entries). A view either
 * declares `columns` + `layout` and renders through the shared grid engines,
 * or renders entirely through `component` (the escape hatch).
 */
export interface PluginView {
  /**
   * Column/row specs for the shared renderer. Return `VerticalColumnSpec[]`
   * when `layout` is 'vertical', `HorizontalRowSpec[]` when 'horizontal'.
   * Omit (together with `layout`) to render `component` instead.
   */
  columns?: (
    date: Temporal.ZonedDateTime,
    config: ViewConfig
  ) => VerticalColumnSpec[] | HorizontalRowSpec[];
  /**
   * The escape hatch: renders the whole view when `columns`/`layout` are
   * absent. Spec-driven views omit it. A view with neither renders nothing
   * (dev builds log a warning).
   */
  component?: ComponentType;
  /**
   * View-switcher icon (a component taking `className`, e.g. a lucide icon).
   * Always shown in the switcher; the label appears beside it only when the
   * view is selected, and as a hover tooltip otherwise.
   */
  icon: ComponentType<{ className?: string }>;
  /** View-switcher label (or a translation key; unknown keys render as-is). */
  label?: string;
  /**
   * The view's intrinsic shape (the author's choice): which engine renders it
   * when the calendar has NO resources. 'vertical' = time flows down;
   * 'horizontal' = date cells flow across in stacked rows. With resources on
   * screen, `orientation` picks the physical layout — this still selects the
   * grid structure (e.g. days vs hours).
   */
  layout?: "vertical" | "horizontal";
  /**
   * Identifies the view type across switcher tabs, URL state, and the
   * context's `view` property. Built-ins use 'day', 'week', 'month', 'year'.
   */
  name: CalendarView;
  /**
   * How far prev/next steps on navigation. An object `{ amount, unit }` steps
   * by `amount` units at a time (e.g. `{ amount: 3, unit: 'day' }` for 3-day);
   * a single `NavUnit` steps 1 unit. Multi-day views must set `amount`
   * so navigation moves a full window.
   *
   * This also selects the header title/date-picker form (the core derives it
   * generically, never by view name): a single `day`/`week`/`month`/`year` step
   * borrows that grid's picker and title; any other step (amount > 1, or a custom
   * unit) shows the day picker over the view's `range`. A third-party view gets
   * the right picker for free just by declaring how it navigates.
   */
  navigationStep?: { amount: number; unit: NavUnit };
  /** How far prev/next steps when `navigationStep` is absent ('week', 'month', …). */
  navigationUnit?: NavUnit;
  /**
   * Visible range for navigation callbacks and the event pipeline. Views
   * without `range` fall back to the month 6x7 grid range. Receives only the
   * `firstDayOfWeek` slice of the config; the full axis config reaches
   * `columns()`/`renderHeader()`.
   */
  range?: (
    date: Temporal.ZonedDateTime,
    config: Pick<ViewConfig, "firstDayOfWeek">
  ) => { start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime };
  /** Header row content rendered above the grid by the shared renderer. */
  renderHeader?: (ctx: ViewHeaderContext) => ReactNode;
  /**
   * Whether `columns()` composes the resource axis when `config.resources`
   * is set. Defaults to false; the view switcher hides resource-incapable
   * views on a resource calendar.
   */
  supportsResources?: boolean;
}

/**
 * A calendar plugin contributes optional behavior and UI through generic hooks
 * named after pipeline moments and mount points, never after a feature. The
 * core stays agnostic of any specific plugin (e.g. recurrence).
 *
 * Hooks follow the Rollup/Vite execution kinds:
 * - `transformEvents` is sequential: each plugin receives the previous
 *   plugin's output, forming a transform chain.
 * - `managesEvent` is first-match: the first plugin whose managesEvent returns
 *   true owns its scoped mutations.
 * - `renderSlot` is additive: every plugin may contribute to a mount point.
 *
 * Hooks are fanned out by the runtime, so a hook's `context` type cannot vary
 * per plugin: `renderSlot` receives a `PluginSlotContext` and `contribute`
 * receives the event at its point. A plugin narrows by the slot name
 * (`SLOT_EVENT_FORM`) or point it handles. Adding a mount point widens those
 * two unions; the hook signatures themselves do not change.
 *
 * `scope` is opaque to the core: the owner produces it (via the mutation-scope
 * slot) and consumes it in `applyEdit` / `applyDelete`. A plugin that provides
 * `applyEdit` / `applyDelete` should also render the mutation-scope slot so the
 * core can gather that scope before mutating.
 */
export interface CalendarPlugin<TMeta = unknown> {
  applyDelete?: (
    args: PluginMutationArgs<TMeta>
  ) => CalendarEvent<TMeta>[] | PluginMutationResult<TMeta>;
  applyEdit?: (
    args: PluginMutationArgs<TMeta>
  ) => CalendarEvent<TMeta>[] | PluginMutationResult<TMeta>;
  /**
   * Contributes data to a named point; `context` is the event at that point
   * (the `ical:vevent-properties` point in the core's ical exporter). Additive:
   * all plugins may contribute to the same point; the runtime aggregates all
   * results via `collect`. Parallel to `renderSlot` but for data, not nodes.
   */
  contribute?: (point: string, context: CalendarEvent) => unknown[];
  managesEvent?: (event: CalendarEvent<TMeta>) => boolean;
  name: string;
  /**
   * Wraps the calendar subtree so the plugin's own React context is available
   * to its views, slots, and components. Rendered as the outermost wrapper
   * among all plugin providers.
   */
  provider?: ComponentType<{ children: ReactNode }>;
  /** Renders the plugin's share of a mount point; see `PluginSlotContext`. */
  renderSlot?: (slotName: string, context: PluginSlotContext) => ReactNode;
  transformEvents?: (
    events: CalendarEvent<TMeta>[],
    range: PluginDateRange
  ) => CalendarEvent<TMeta>[];
  /**
   * Registers new view types that the calendar can switch to. Each entry in
   * the array describes one view (id, component, navigation unit, …).
   */
  views?: PluginView[];
}

// --- Host slot contracts ---------------------------------------------------

/** Context passed to the `event-form` slot (inside the create/edit form). */
export interface EventFormSlotContext {
  event: CalendarEvent;
  onChange: (updates: Partial<CalendarEvent>) => void;
}

/**
 * Context passed to the `event-mutation-scope` slot. The owning plugin renders
 * UI to gather its opaque `scope`, then calls `resolve(scope)` (or `cancel`).
 */
export interface EventMutationScopeSlotContext {
  cancel: () => void;
  event: CalendarEvent;
  operation: "edit" | "delete";
  resolve: (scope: string) => void;
}

/**
 * The context a `renderSlot` hook receives. The runtime fans one `renderSlot`
 * call out to every plugin, so the type cannot vary per plugin; it is the union
 * of the core's mount-point shapes, which a plugin narrows by the slot name it
 * handles. Mount points that carry data rather than nodes (e.g. the
 * `ical:vevent-properties` point) reach plugins through `contribute` instead.
 */
export type PluginSlotContext =
  | EventFormSlotContext
  | EventMutationScopeSlotContext;

/**
 * Available calendar view types. The built-in views (day, week, month, year)
 * are `PluginView` specs in `features/calendar/components/views`; plugins may
 * contribute additional view names, so any other string is valid too. The four
 * literals stay in the union so the built-ins autocomplete: a bare `| string`
 * would collapse the union back to `string`.
 */
export type CalendarView =
  | "day"
  | "week"
  | "month"
  | "year"
  | (string & Record<never, never>);

/**
 * Time format options for displaying times in the calendar.
 */
export type TimeFormat = "12-hour" | "24-hour" | "12h" | "24h";
