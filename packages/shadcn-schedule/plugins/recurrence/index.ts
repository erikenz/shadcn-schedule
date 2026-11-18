// Public entry for the recurrence plugin.
// Re-exporting from this module registers the CalendarEvent augmentation for
// consumers and keeps the `declare module` block in the emitted d.ts (a
// side-effect-only import would be tree-shaken from the declaration bundle).

export { recurrenceICalProperties } from "@/plugins/recurrence/ical";

export { recurrencePlugin } from "@/plugins/recurrence/recurrence-plugin";

export { generateRecurringEvents } from "@/plugins/recurrence/utils/generate-recurring-events";

export { isRecurringEvent } from "@/plugins/recurrence/utils/series-helpers";

export type { RecurrenceAugmentation } from "@/plugins/recurrence/augment";

export type { RRuleOptions, Weekday } from "@/plugins/recurrence/types";
