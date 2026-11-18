import "@/index.ts";
import type { RRuleOptions } from "@/plugins/recurrence/types";

// The augmentation targets `types/index.ts`, the single `CalendarEvent`
// declaration of this package (it is re-exported by the root `index.ts`).
// Declaration merging is scoped to this plugin's compilation, so within
// recurrence every `CalendarEvent` (imported here AND returned by the
// calendar runtime) gains `rrule`/`recurrenceId`/`exdates`.
declare module "@/types/index.ts" {
  interface CalendarEvent {
    exdates?: string[] | null;
    recurrenceId?: string | null;
    rrule?: RRuleOptions | null;
  }
}

/**
 * Marker re-exported by the recurrence entry so the declaration bundler keeps
 * this module — and therefore the `declare module` augmentation above — in
 * the emitted `index.d.ts`. A side-effect-only `import '@/plugins/recurrence/augment'` is
 * otherwise tree-shaken from the type bundle, which would strip
 * `rrule`/`recurrenceId`/`exdates` from the public `CalendarEvent`.
 */
export type RecurrenceAugmentation = RRuleOptions;
