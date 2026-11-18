import { dayView } from "@/features/calendar/components/views/day";
import { monthView } from "@/features/calendar/components/views/month";
import { weekView } from "@/features/calendar/components/views/week";
import { yearView } from "@/features/calendar/components/views/year";
import type { PluginView } from "@/types/index";

/** The core's own views, resolved exactly like plugin views (prepended first). */
export const builtInViews: PluginView[] = [
  dayView,
  weekView,
  monthView,
  yearView,
];
