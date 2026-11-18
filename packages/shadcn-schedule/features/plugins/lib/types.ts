import type { ComponentType, ReactNode } from "react";

import type {
  CalendarEvent,
  CalendarPlugin,
  PluginDateRange,
  PluginSlotContext,
  PluginView,
} from "@/types/index";

// The plugin SDK contract (CalendarPlugin, PluginMutationArgs, PluginDateRange,
// PluginView, ...) lives in the shared `types` package so plugins
// depend on a lightweight contract, not the whole calendar. `PluginRuntime`
// is the core's internal aggregator and stays here.

export interface PluginRuntime<TMeta = unknown> {
  collect: (point: string, context: CalendarEvent) => unknown[];
  getEventManager: (
    event: CalendarEvent<TMeta>
  ) => CalendarPlugin<TMeta> | undefined;
  /** Returns all providers declared by plugins, in plugin order (omits plugins with no provider). */
  getProviders: () => ComponentType<{ children: ReactNode }>[];
  /** Returns all views registered across all plugins, in plugin order. */
  getViews: () => PluginView[];
  renderSlot: (slotName: string, context: PluginSlotContext) => ReactNode[];
  transformEvents: (
    events: CalendarEvent<TMeta>[],
    range: PluginDateRange
  ) => CalendarEvent<TMeta>[];
}
