import { Grid2x2 } from "lucide-react";

import { YearView } from "@/features/calendar/components/year-view/year-view";
import type { PluginView } from "@/types/index";
import { endOf, startOf } from "@/utils/temporal";

// The 12-mini-calendar layout fits neither shared engine, so the year view is
// the canonical `component` escape hatch: no `columns`/`layout`, full custom
// rendering — but range/navigation/label resolve through the one contract.
export const yearView: PluginView = {
  component: YearView,
  icon: Grid2x2,
  label: "year",
  name: "year",
  navigationUnit: "year",
  range: (date) => ({ end: endOf(date, "year"), start: startOf(date, "year") }),
  // The year view does not compose the resource axis, so the switcher hides
  // it on resource calendars.
  supportsResources: false,
};
