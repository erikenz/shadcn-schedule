import { useState } from "react";

import { useCalendarContext } from "@/features/calendar/hooks/use-smart-calendar-context";
import { hasText, textOr } from "@/lib/guards";
import { RecurrenceEditor } from "@/plugins/recurrence/components/recurrence-editor/recurrence-editor";
import type { RRuleOptions } from "@/plugins/recurrence/types";
import type { CalendarEvent } from "@/types/index";
import { toDate } from "@/utils/temporal";

interface Props {
  // A draft event may have no start yet (selectedEvent can be incomplete); the
  // section only reads the fields it needs.
  event: Partial<CalendarEvent>;
  onChange: (updates: Partial<CalendarEvent>) => void;
}

export const RecurrenceFormSection = ({ event, onChange }: Props) => {
  // Use raw (unexpanded) events: generated instances drop their rrule, so the
  // base series only exists in the raw list.
  const { rawEvents } = useCalendarContext();
  // Find the base recurring event sharing this event's uid (the parent series).
  const targetUid = event.uid;
  let parent: CalendarEvent | undefined;

  if (hasText(targetUid)) {
    parent = rawEvents.find((candidate) => {
      const candidateUid = textOr(
        candidate.uid,
        `${candidate.id}@calendar.local`
      );

      const isSameSeries = candidateUid === targetUid;

      return isSameSeries && Boolean(candidate.rrule);
    });
  }

  const [rrule, setRrule] = useState<RRuleOptions | null>(
    event.rrule ?? parent?.rrule ?? null
  );

  const handleChange = (next: RRuleOptions | null) => {
    if (!next) {
      setRrule(null);
      onChange({ rrule: null });

      return;
    }

    // Anchor the series to the event's start when the rule omits its own
    // dtstart. A draft event may have no start yet; in that case pass the rule
    // through unanchored rather than dereferencing a missing start.
    const dtstart =
      next.dtstart ?? (event.start ? toDate(event.start) : undefined);

    const resolved = dtstart ? { ...next, dtstart } : next;
    setRrule(resolved);
    onChange({ rrule: resolved });
  };

  return (
    <RecurrenceEditor
      onChange={handleChange}
      referenceDate={event.start ? toDate(event.start) : undefined}
      value={rrule}
    />
  );
};
