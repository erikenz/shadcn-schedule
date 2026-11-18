import { createAgendaView } from "@/plugins/agenda/utils/create-agenda-view";
import type { AgendaViewOptions } from "@/plugins/agenda/utils/create-agenda-view";
import type { CalendarPlugin } from "@/types/index";

/** Opt-in agenda plugin: registers the `agenda` view. Pass to `Calendar`'s `plugins`. */
export const agendaPlugin = (
  options: AgendaViewOptions = {}
): CalendarPlugin => ({
  name: "agenda",
  views: [createAgendaView(options)],
});
