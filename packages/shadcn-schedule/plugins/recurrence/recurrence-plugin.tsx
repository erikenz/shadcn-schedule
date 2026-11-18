import "@/plugins/recurrence/augment";
import {
  SLOT_EVENT_FORM,
  SLOT_EVENT_MUTATION_SCOPE,
} from "@/components/calendar-slots";
import { RecurrenceEditDialog } from "@/plugins/recurrence/components/recurrence-edit-dialog/recurrence-edit-dialog";
import { RecurrenceFormSection } from "@/plugins/recurrence/components/recurrence-form-section";
import { recurrenceICalProperties } from "@/plugins/recurrence/ical";
import type { RecurrenceEditScope } from "@/plugins/recurrence/types";
import { deleteRecurringEvent } from "@/plugins/recurrence/utils/delete-recurring-event";
import { generateRecurringEvents } from "@/plugins/recurrence/utils/generate-recurring-events";
import { isRecurringEvent } from "@/plugins/recurrence/utils/series-helpers";
import { updateRecurringEvent } from "@/plugins/recurrence/utils/update-recurring-event";
import type {
  CalendarEvent,
  CalendarPlugin,
  EventFormSlotContext,
  EventMutationScopeSlotContext,
  PluginMutationArgs,
} from "@/types/index";

// The core guarantees the built-in slot contexts' shapes; these guards narrow
// the opaque `unknown` at the plugin boundary instead of asserting it.
const isEventFormSlotContext = (
  value: unknown
): value is EventFormSlotContext => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return Object.hasOwn(value, "event") && Object.hasOwn(value, "onChange");
};

const isEventMutationScopeSlotContext = (
  value: unknown
): value is EventMutationScopeSlotContext => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    Object.hasOwn(value, "event") &&
    Object.hasOwn(value, "operation") &&
    Object.hasOwn(value, "resolve")
  );
};

const isRecurringEventLike = (value: unknown): value is CalendarEvent => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    Object.hasOwn(value, "start") &&
    Object.hasOwn(value, "end") &&
    Object.hasOwn(value, "title")
  );
};

// The mutation-scope slot always resolves a RecurrenceEditScope; keep the
// contract honest by rejecting anything else the way the handlers do.
const toRecurrenceEditScope = (value: string): RecurrenceEditScope => {
  if (value === "this" || value === "following" || value === "all") {
    return value;
  }

  throw new Error(
    `Invalid scope: ${value}. Must be 'this', 'following', or 'all'`
  );
};

/**
 * Built-in recurrence plugin. Implements the generic CalendarPlugin contract by
 * delegating to the existing recurrence handler functions and editor
 * components.
 */
export const recurrencePlugin = (): CalendarPlugin => ({
  applyDelete: ({ event, currentEvents, scope }: PluginMutationArgs) =>
    deleteRecurringEvent({
      currentEvents,
      scope: toRecurrenceEditScope(scope),
      targetEvent: event,
    }),

  applyEdit: ({ event, updates, currentEvents, scope }: PluginMutationArgs) =>
    updateRecurringEvent({
      currentEvents,
      scope: toRecurrenceEditScope(scope),
      targetEvent: event,
      updates: updates ?? {},
    }),

  contribute: (point, context) => {
    if (point !== "ical:vevent-properties") {
      return [];
    }

    if (!isRecurringEventLike(context)) {
      return [];
    }

    return recurrenceICalProperties(context);
  },

  // Mirrors the previous `isRecurringEvent` gate (rrule, recurrenceId, or uid)
  // so drag/edit routing is unchanged.
  managesEvent: (event) => isRecurringEvent(event),
  name: "recurrence",

  renderSlot: (slotName, context) => {
    if (slotName === SLOT_EVENT_FORM && isEventFormSlotContext(context)) {
      const { event, onChange } = context;

      return <RecurrenceFormSection event={event} onChange={onChange} />;
    }

    if (
      slotName === SLOT_EVENT_MUTATION_SCOPE &&
      isEventMutationScopeSlotContext(context)
    ) {
      const { event, operation, resolve, cancel } = context;

      const handleConfirm = (scope: RecurrenceEditScope) => {
        resolve(scope);
      };

      return (
        <RecurrenceEditDialog
          eventTitle={event.title || ""}
          isOpen={true}
          onClose={cancel}
          onConfirm={handleConfirm}
          operationType={operation}
        />
      );
    }

    return null;
  },

  // Expand each base (rrule) event into its in-range instances, merging any
  // detached overrides found in the full list. Non-base events (plain events,
  // modified instances) pass through untouched.
  transformEvents: (events, range) =>
    events.flatMap((event) => {
      if (!event.rrule) {
        return [event];
      }

      return generateRecurringEvents({
        event,
        currentEvents: events,
        endDate: range.end,
        startDate: range.start,
      });
    }),
});
