import { DragToCreateProvider } from "@/plugins/drag-to-create/components/drag-to-create-provider";
import type { DragToCreateOptions } from "@/plugins/drag-to-create/types";
import type { CalendarPlugin } from "@/types/index";

/**
 * Opt-in drag-to-create plugin. Press an empty cell and drag across the grid to
 * select a range; releasing opens the event form preselected with it (or runs
 * your `onSelect`). Works in month, week, and day views, regular and resource
 * calendars, both orientations. Mouse/pen starts on a small drag past the
 * threshold; touch starts on a press-and-hold then drag (a quick swipe still
 * scrolls). Pass to `Calendar`'s `plugins`.
 */
export const dragToCreatePlugin = (
  options: DragToCreateOptions = {}
): CalendarPlugin => ({
  name: "drag-to-create",
  provider: ({ children }) => (
    <DragToCreateProvider options={options}>{children}</DragToCreateProvider>
  ),
});
