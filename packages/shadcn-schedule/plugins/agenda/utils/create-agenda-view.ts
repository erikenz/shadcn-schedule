import { List } from "lucide-react";
import { createElement } from "react";

import { AgendaView } from "@/plugins/agenda/components/agenda-view";
import { windowRange, windowStep } from "@/plugins/agenda/utils/agenda-window";
import type { AgendaWindow } from "@/plugins/agenda/utils/agenda-window";
import type { PluginView } from "@/types/index";

export interface AgendaViewOptions {
  /**
   * The date window the agenda lists and that prev/next steps over. Default 'month'.
   * A named period ('day' | 'week' | 'month') is the calendar period *containing*
   * the current date, so it can include earlier days of that period (and aligns
   * with the matching grid view + header label). A number is a rolling window of
   * that many days starting *at* the current date and counting forward.
   */
  window?: AgendaWindow;
}

/** Builds the agenda `PluginView` for the given window. */
export const createAgendaView = ({
  window = "month",
}: AgendaViewOptions = {}): PluginView => ({
  component: () => createElement(AgendaView, { window }),
  icon: List,
  label: "agenda",
  name: "agenda",
  navigationStep: windowStep(window),
  range: (date, config) => windowRange(date, window, config.firstDayOfWeek),
  supportsResources: false,
});
