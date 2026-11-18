import { createElement, Fragment } from "react";
import type { ReactNode } from "react";

import type { PluginRuntime } from "@/features/plugins/lib/types";
import { eventOverlapsRange } from "@/lib/events/pipeline";
import type { CalendarPlugin } from "@/types/index";

export const createPluginRuntime = <TMeta = unknown>(
  plugins: CalendarPlugin<TMeta>[]
): PluginRuntime<TMeta> => ({
  collect: (point, context) =>
    plugins.flatMap((plugin) => plugin.contribute?.(point, context) ?? []),

  getEventManager: (event) =>
    plugins.find((plugin) => plugin.managesEvent?.(event) === true),

  getProviders: () =>
    plugins.flatMap((plugin) => {
      const { provider } = plugin;

      return provider === null || provider === undefined ? [] : [provider];
    }),

  getViews: () => plugins.flatMap((plugin) => plugin.views ?? []),

  // Every plugin may contribute to a slot. Each node is keyed by plugin name
  // so consumers can render the returned array directly.
  renderSlot: (slotName, context) => {
    const nodes: ReactNode[] = [];

    for (const plugin of plugins) {
      const node = plugin.renderSlot?.(slotName, context);
      const isPresent = node !== null && node !== undefined;

      if (isPresent) {
        nodes.push(createElement(Fragment, { key: plugin.name }, node));
      }
    }

    return nodes;
  },
  // Sequential transform chain, then the core applies the range-overlap filter
  // (the baseline every view expects) so plugins only worry about producing
  // events, not range-trimming.
  transformEvents: (events, range) => {
    let result = events;

    for (const plugin of plugins) {
      if (plugin.transformEvents) {
        result = plugin.transformEvents(result, range);
      }
    }

    return result.filter((event) =>
      eventOverlapsRange(event, range.start, range.end)
    );
  },
});
